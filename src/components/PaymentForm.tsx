import {
  useContext,
  useState,
  type FormEvent,
} from "react";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { PaymentContext } from "../context/PaymentContext";
import {
  calculateHourlyRate,
  calculateNetEarnings,
  getDefaultHelperPayout,
} from "../utils/paymentCalculations";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatCleaningDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
};

function PaymentForm() {
  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);
  const paymentContext = useContext(PaymentContext);

  const [selectedCleaningId, setSelectedCleaningId] =
    useState("");

  const [amountCharged, setAmountCharged] = useState(0);
  const [actualHours, setActualHours] = useState(0);
  const [helperPayout, setHelperPayout] = useState(0);

  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  if (!paymentContext) {
    throw new Error("PaymentContext not found");
  }

  const { cleanings } = cleaningContext;
  const { clients } = clientContext;
  const { payments, addPayment } = paymentContext;

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const availableCleanings = cleanings
    .filter((cleaning) => {
      if (
        !cleaning.firestoreId ||
        cleaning.status === "Cancelled"
      ) {
        return false;
      }

      return !payments.some(
        (payment) =>
          payment.cleaningId === cleaning.firestoreId
      );
    })
    .sort((first, second) => {
      const firstDateTime =
        `${first.date}T${first.startTime}`;

      const secondDateTime =
        `${second.date}T${second.startTime}`;

      return secondDateTime.localeCompare(firstDateTime);
    });

  const selectedCleaning = cleanings.find(
    (cleaning) =>
      cleaning.firestoreId === selectedCleaningId
  );

  const selectedClient = selectedCleaning
    ? clients.find(
        (client) =>
          client.firestoreId ===
          selectedCleaning.clientId
      )
    : undefined;

  const netEarnings = calculateNetEarnings(
    amountCharged,
    helperPayout
  );

  const hourlyRate = calculateHourlyRate(
    amountCharged,
    helperPayout,
    actualHours
  );

  const handleCleaningChange = (
    cleaningId: string
  ) => {
    setSelectedCleaningId(cleaningId);
    setErrorMessage("");

    const cleaning = cleanings.find(
      (savedCleaning) =>
        savedCleaning.firestoreId === cleaningId
    );

    if (!cleaning) {
      setAmountCharged(0);
      setActualHours(0);
      setHelperPayout(0);
      return;
    }

    const client = clients.find(
      (savedClient) =>
        savedClient.firestoreId === cleaning.clientId
    );

    const defaultAmount =
      client?.pricePerCleaning ?? 0;

    const hasHelper =
      cleaning.assignedHelpers.length > 0;

    setAmountCharged(defaultAmount);
    setActualHours(cleaning.estimatedHours);

    setHelperPayout(
      getDefaultHelperPayout(
        defaultAmount,
        hasHelper
      )
    );

    setPaid(false);
    setPaidDate("");
    setNotes("");
  };

  const resetForm = () => {
    setSelectedCleaningId("");
    setAmountCharged(0);
    setActualHours(0);
    setHelperPayout(0);
    setPaid(false);
    setPaidDate("");
    setNotes("");
    setErrorMessage("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    if (
      !selectedCleaning ||
      !selectedCleaning.firestoreId
    ) {
      alert("Please select a valid cleaning.");
      return;
    }

    if (!selectedClient) {
      alert(
        "The client connected to this cleaning could not be found."
      );
      return;
    }

    const duplicatePayment = payments.some(
      (payment) =>
        payment.cleaningId ===
        selectedCleaning.firestoreId
    );

    if (duplicatePayment) {
      alert(
        "This cleaning already has a payment record."
      );
      return;
    }

    if (
      !Number.isFinite(amountCharged) ||
      amountCharged < 0.01 ||
      amountCharged > 10000
    ) {
      alert(
        "Amount charged must be between $0.01 and $10,000."
      );
      return;
    }

    if (
      !Number.isFinite(actualHours) ||
      actualHours < 0.25 ||
      actualHours > 24
    ) {
      alert(
        "Actual hours must be between 0.25 and 24."
      );
      return;
    }

    if (
      !Number.isFinite(helperPayout) ||
      helperPayout < 0 ||
      helperPayout > amountCharged
    ) {
      alert(
        "Helper payout cannot be negative or greater than the amount charged."
      );
      return;
    }

    if (paid) {
      const validPaidDate =
        /^\d{4}-\d{2}-\d{2}$/.test(paidDate);

      if (!validPaidDate) {
        alert(
          "Please enter the date the client paid."
        );
        return;
      }
    }

    if (notes.trim().length > 1000) {
      alert(
        "Notes must be 1,000 characters or fewer."
      );
      return;
    }

    setSaving(true);

    try {
      await addPayment({
        cleaningId: selectedCleaning.firestoreId,
        clientId: selectedCleaning.clientId,
        clientName: selectedClient.name,
        cleaningDate: selectedCleaning.date,
        amountCharged,
        actualHours,
        helperPayout,
        paid,
        paidDate: paid ? paidDate : "",
        notes: notes.trim(),
      });

      resetForm();
    } catch (error) {
      console.error(
        "Failed to save payment:",
        error
      );

      setErrorMessage(
        "The payment could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-bold text-[var(--charcoal)]">
        Add Payment Record
      </h2>

      <p className="mt-1 text-sm text-[var(--muted)]">
        Select a cleaning and confirm its financial details.
      </p>

      <label
        htmlFor="paymentCleaning"
        className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
      >
        Cleaning
      </label>

      <select
        id="paymentCleaning"
        value={selectedCleaningId}
        required
        onChange={(event) =>
          handleCleaningChange(event.target.value)
        }
        className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
      >
        <option value="">
          Select a cleaning
        </option>

        {availableCleanings.map((cleaning) => {
          const client = clients.find(
            (savedClient) =>
              savedClient.firestoreId ===
              cleaning.clientId
          );

          return (
            <option
              key={cleaning.firestoreId}
              value={cleaning.firestoreId}
            >
              {client?.name ?? "Client unavailable"} —{" "}
              {formatCleaningDate(cleaning.date)} —{" "}
              {cleaning.startTime}
            </option>
          );
        })}
      </select>

      {availableCleanings.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          No cleaning is currently available for a new
          payment record.
        </p>
      )}

      {selectedCleaning && (
        <>
          <label
            htmlFor="amountCharged"
            className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
          >
            Amount Charged
          </label>

          <input
            id="amountCharged"
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            value={amountCharged}
            required
            onChange={(event) =>
              setAmountCharged(
                Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
          />

          <label
            htmlFor="actualHours"
            className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
          >
            Actual Hours at the House
          </label>

          <input
            id="actualHours"
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            value={actualHours}
            required
            onChange={(event) =>
              setActualHours(
                Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
          />

          <p className="mt-2 text-sm text-[var(--muted)]">
            Enter the real time you were there. Do not
            multiply it by the number of workers.
          </p>

          <label
            htmlFor="helperPayout"
            className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
          >
            Total Helper Payout
          </label>

          <input
            id="helperPayout"
            type="number"
            min="0"
            max={amountCharged || 0}
            step="0.01"
            value={helperPayout}
            required
            onChange={(event) =>
              setHelperPayout(
                Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
          />

          {selectedCleaning.assignedHelpers.length > 0 && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              A 50/50 split was entered automatically.
              You can change it.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--cream)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
                Your Net
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--charcoal)]">
                {formatCurrency(netEarnings)}
              </p>
            </div>

            <div className="rounded-xl bg-[var(--cream)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
                Your Hourly Rate
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--charcoal)]">
                {formatCurrency(hourlyRate)}
              </p>
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={paid}
              onChange={(event) => {
                const checked =
                  event.target.checked;

                setPaid(checked);
                setPaidDate(
                  checked ? today : ""
                );
              }}
            />

            <span className="font-medium text-[var(--charcoal)]">
              Client has paid
            </span>
          </label>

          {paid && (
            <>
              <label
                htmlFor="paidDate"
                className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
              >
                Paid Date
              </label>

              <input
                id="paidDate"
                type="date"
                value={paidDate}
                required
                onChange={(event) =>
                  setPaidDate(event.target.value)
                }
                className="block w-0 min-w-full max-w-full appearance-none rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
              />
            </>
          )}

          <label
            htmlFor="paymentNotes"
            className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
          >
            Notes
          </label>

          <textarea
            id="paymentNotes"
            value={notes}
            rows={3}
            maxLength={1000}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
          />
        </>
      )}

      {errorMessage && (
        <p className="mt-5 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={
          saving ||
          !selectedCleaningId ||
          availableCleanings.length === 0
        }
        className="mt-6 w-full rounded-xl bg-[var(--blue-dark)] py-3 font-medium text-white transition hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving
          ? "Saving..."
          : "Save Payment Record"}
      </button>
    </form>
  );
}

export default PaymentForm;