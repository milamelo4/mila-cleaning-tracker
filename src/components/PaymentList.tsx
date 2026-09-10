import { useContext, useState } from "react";
import { PaymentContext } from "../context/PaymentContext";
import type { Payment } from "../types/payment";
import {
  calculateHourlyRate,
  calculateNetEarnings,
} from "../utils/paymentCalculations";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatPaymentDate = (date: string) => {
  return new Date(`${date}T00:00:00`).toLocaleDateString();
};

const formatMonthHeading = (year: string, month: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${year}-${month}-01T00:00:00`));
};

function PaymentList() {
  const paymentContext = useContext(PaymentContext);

  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(
    null
  );
  const [editedPayment, setEditedPayment] = useState<Payment | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [clientSearch, setClientSearch] = useState("");

  if (!paymentContext) {
    throw new Error("PaymentContext not found");
  }

  const { payments, updatePayment, deletePayment } = paymentContext;

  const availableYears = Array.from(
    new Set([
      currentYear,
      ...payments.map((payment) => payment.cleaningDate.slice(0, 4)),
    ])
  ).sort((a, b) => Number(b) - Number(a));

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const handleStartEditing = (payment: Payment) => {
    setEditingPaymentId(payment.firestoreId ?? null);
    setEditedPayment({ ...payment });
  };

  const handleSaveEditing = async () => {
    if (!editedPayment) return;

    await updatePayment(editedPayment);

    setEditingPaymentId(null);
    setEditedPayment(null);
  };

  const handleCancelEditing = () => {
    setEditingPaymentId(null);
    setEditedPayment(null);
  };

  const handleDelete = async (firestoreId?: string) => {
    if (!firestoreId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmed) return;

    await deletePayment(firestoreId);
  };

  const searchTerm = clientSearch.trim().toLowerCase();

  const matchesClientSearch = (payment: Payment) =>
    payment.clientName.toLowerCase().includes(searchTerm);

  const selectedMonthPayments = payments.filter((payment) => {
    const paymentYear = payment.cleaningDate.slice(0, 4);
    const paymentMonth = payment.cleaningDate.slice(5, 7);

    return (
      paymentYear === selectedYear &&
      paymentMonth === selectedMonth &&
      matchesClientSearch(payment)
    );
  });

  const monthTotals = selectedMonthPayments.reduce(
    (totals, payment) => {
      totals.charged += payment.amountCharged;
      totals.helper += payment.helperPayout;
      totals.net += calculateNetEarnings(
        payment.amountCharged,
        payment.helperPayout
      );

      if (payment.paid) {
        totals.paid += payment.amountCharged;
      } else {
        totals.unpaid += payment.amountCharged;
      }

      return totals;
    },
    {
      charged: 0,
      helper: 0,
      net: 0,
      paid: 0,
      unpaid: 0,
    }
  );

  const outstandingPayments = payments
    .filter(
      (payment) => !payment.paid && matchesClientSearch(payment)
    )
    .sort((a, b) =>
      a.cleaningDate.localeCompare(b.cleaningDate)
    );

  const paymentHistory = [...selectedMonthPayments]
    .sort((a, b) => {
      const dateComparison = b.cleaningDate.localeCompare(
        a.cleaningDate
      );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return a.clientName.localeCompare(b.clientName);
    });

  const outstandingTotal = outstandingPayments.reduce(
    (total, payment) => total + payment.amountCharged,
    0
  );

  const renderPaymentCard = (payment: Payment) => {
    const isEditing =
      editingPaymentId === payment.firestoreId &&
      editedPayment !== null;

    const netEarnings = calculateNetEarnings(
      payment.amountCharged,
      payment.helperPayout
    );

    const hourlyRate = calculateHourlyRate(
      payment.amountCharged,
      payment.helperPayout,
      payment.actualHours
    );

    const inputKey = payment.firestoreId ?? payment.cleaningId;

    return (
      <div
        key={
          payment.firestoreId ??
          `${payment.cleaningId}-${payment.cleaningDate}`
        }
        className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-[var(--charcoal)]">
              {payment.clientName}
            </h4>

            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatPaymentDate(payment.cleaningDate)}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              payment.paid
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {payment.paid ? "Paid" : "Unpaid"}
          </span>
        </div>

        {isEditing && editedPayment && (
          <div className="mt-4 rounded-xl border border-[var(--border-soft)] p-4">
            <label
              htmlFor={`payment-amount-${inputKey}`}
              className="block text-sm font-medium text-[var(--charcoal)]"
            >
              Amount charged
            </label>

            <input
              id={`payment-amount-${inputKey}`}
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              onWheel={(event) => event.currentTarget.blur()}
              value={editedPayment.amountCharged}
              onChange={(event) =>
                setEditedPayment({
                  ...editedPayment,
                  amountCharged: Number(event.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
            />

            <label
              htmlFor={`payment-hours-${inputKey}`}
              className="mt-4 block text-sm font-medium text-[var(--charcoal)]"
            >
              Actual hours
            </label>

            <input
              id={`payment-hours-${inputKey}`}
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              onWheel={(event) => event.currentTarget.blur()}
              value={editedPayment.actualHours}
              onChange={(event) =>
                setEditedPayment({
                  ...editedPayment,
                  actualHours: Number(event.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
            />

            <label
              htmlFor={`payment-helper-${inputKey}`}
              className="mt-4 block text-sm font-medium text-[var(--charcoal)]"
            >
              Helper payout
            </label>

            <input
              id={`payment-helper-${inputKey}`}
              type="number"
              min="0"
              max={editedPayment.amountCharged}
              step="0.01"
              onWheel={(event) => event.currentTarget.blur()}
              value={editedPayment.helperPayout}
              onChange={(event) =>
                setEditedPayment({
                  ...editedPayment,
                  helperPayout: Number(event.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
            />

            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--charcoal)]">
              <input
                type="checkbox"
                checked={editedPayment.paid}
                onChange={(event) =>
                  setEditedPayment({
                    ...editedPayment,
                    paid: event.target.checked,
                    paidDate: event.target.checked
                      ? editedPayment.paidDate ||
                        new Date().toISOString().split("T")[0]
                      : "",
                  })
                }
              />

              Paid
            </label>

            {editedPayment.paid && (
              <>
                <label
                  htmlFor={`payment-paid-date-${inputKey}`}
                  className="mt-4 block text-sm font-medium text-[var(--charcoal)]"
                >
                  Paid date
                </label>

                <input
                  id={`payment-paid-date-${inputKey}`}
                  type="date"
                  value={editedPayment.paidDate}
                  onChange={(event) =>
                    setEditedPayment({
                      ...editedPayment,
                      paidDate: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
                />
              </>
            )}

            <label
              htmlFor={`payment-notes-${inputKey}`}
              className="mt-4 block text-sm font-medium text-[var(--charcoal)]"
            >
              Notes
            </label>

            <textarea
              id={`payment-notes-${inputKey}`}
              value={editedPayment.notes}
              onChange={(event) =>
                setEditedPayment({
                  ...editedPayment,
                  notes: event.target.value,
                })
              }
              rows={3}
              maxLength={1000}
              className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveEditing}
                className="rounded-lg bg-[var(--charcoal)] px-4 py-2 text-sm font-semibold text-white"
              >
                Save changes
              </button>

              <button
                type="button"
                onClick={handleCancelEditing}
                className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--charcoal)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[var(--muted)]">Charged</p>
            <p className="font-semibold">
              {formatCurrency(payment.amountCharged)}
            </p>
          </div>

          <div>
            <p className="text-[var(--muted)]">Helper</p>
            <p className="font-semibold">
              {formatCurrency(payment.helperPayout)}
            </p>
          </div>

          <div>
            <p className="text-[var(--muted)]">Net earnings</p>
            <p className="font-semibold">
              {formatCurrency(netEarnings)}
            </p>
          </div>

          <div>
            <p className="text-[var(--muted)]">Hourly rate</p>
            <p className="font-semibold">
              {formatCurrency(hourlyRate)}/hr
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleStartEditing(payment)}
            className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--charcoal)] hover:bg-gray-50"
          >
            Edit payment
          </button>

          <button
            type="button"
            onClick={() => handleDelete(payment.firestoreId)}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete payment
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 space-y-8">
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            Payment History
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose a month to review its payments and summary.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="paymentYear"
                className="mb-2 block text-sm font-medium text-[var(--charcoal)]"
              >
                Year
              </label>

              <select
                id="paymentYear"
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="paymentMonth"
                className="mb-2 block text-sm font-medium text-[var(--charcoal)]"
              >
                Month
              </label>

              <select
                id="paymentMonth"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="paymentClientSearch"
                className="mb-2 block text-sm font-medium text-[var(--charcoal)]"
              >
                Search client
              </label>

              <input
                id="paymentClientSearch"
                type="search"
                value={clientSearch}
                placeholder="Enter client name"
                onChange={(event) =>
                  setClientSearch(event.target.value)
                }
                className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--cream)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-bold text-[var(--charcoal)]">
              {formatMonthHeading(selectedYear, selectedMonth)}
            </h3>

            <p className="text-sm text-[var(--muted)]">
              {selectedMonthPayments.length}{" "}
              {selectedMonthPayments.length === 1
                ? "payment"
                : "payments"}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-[var(--muted)]">
                Total charged
              </p>
              <p className="mt-1 font-bold text-[var(--charcoal)]">
                {formatCurrency(monthTotals.charged)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-[var(--muted)]">
                Helper payouts
              </p>
              <p className="mt-1 font-bold text-[var(--charcoal)]">
                {formatCurrency(monthTotals.helper)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-[var(--muted)]">
                Net earnings
              </p>
              <p className="mt-1 font-bold text-[var(--charcoal)]">
                {formatCurrency(monthTotals.net)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-[var(--muted)]">Paid</p>
              <p className="mt-1 font-bold text-green-700">
                {formatCurrency(monthTotals.paid)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-[var(--muted)]">Unpaid</p>
              <p className="mt-1 font-bold text-amber-700">
                {formatCurrency(monthTotals.unpaid)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[var(--charcoal)]">
              Outstanding Payments
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              All unpaid payments, oldest first.
            </p>
          </div>

          {outstandingPayments.length > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Total owed
              </p>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(outstandingTotal)}
              </p>
            </div>
          )}
        </div>

        {outstandingPayments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-6 text-center">
            <p className="font-semibold text-[var(--charcoal)]">
              No outstanding payments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {outstandingPayments.map((payment) =>
              renderPaymentCard(payment)
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[var(--charcoal)]">
              Payment History
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Payments from {formatMonthHeading(selectedYear, selectedMonth)}, newest first.
            </p>
          </div>

          <p className="text-sm text-[var(--muted)]">
            {paymentHistory.length}{" "}
            {paymentHistory.length === 1 ? "payment" : "payments"}
          </p>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-6 text-center">
            <p className="font-semibold text-[var(--charcoal)]">
              No payments for this month.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentHistory.map((payment) =>
              renderPaymentCard(payment)
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default PaymentList;
