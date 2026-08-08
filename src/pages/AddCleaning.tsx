import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { MemberContext } from "../context/MemberContext";
import {
  findCleaningConflict,
  generateRecurringDates,
  type RepeatPattern,
} from "../utils/cleaningSchedule";
import type { Cleaning } from "../types/cleaning";

const repeatPatternLabels: Record<RepeatPattern, string> = {
  none: "Does not repeat",
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
};

function AddCleaning() {
  const navigate = useNavigate();

  const clientContext = useContext(ClientContext);
  const memberContext = useContext(MemberContext);
  const cleaningContext = useContext(CleaningContext);

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [notes, setNotes] = useState("");
  const [assignedHelpers, setAssignedHelpers] = useState<string[]>([]);

  const [repeatPattern, setRepeatPattern] =
    useState<RepeatPattern>("none");

  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  const { clients } = clientContext;
  const { helpers } = memberContext;
  const { addCleanings, cleanings } = cleaningContext;

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const isRecurring = repeatPattern !== "none";

  const previewDates = date
    ? generateRecurringDates(
        date,
        repeatEndDate,
        repeatPattern
      )
    : [];

  const generatedAppointmentCount = previewDates.length;

  const handleHelperChange = (
    helperId: string,
    checked: boolean
  ) => {
    if (checked) {
      setAssignedHelpers((current) => [
        ...current,
        helperId,
      ]);

      return;
    }

    setAssignedHelpers((current) =>
      current.filter((uid) => uid !== helperId)
    );
  };

  const handleRepeatPatternChange = (
    selectedPattern: RepeatPattern
  ) => {
    setRepeatPattern(selectedPattern);

    if (selectedPattern === "none") {
      setRepeatEndDate("");
      return;
    }

    if (
      date &&
      (!repeatEndDate || repeatEndDate < date)
    ) {
      setRepeatEndDate(date);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    const selectedClient = clients.find(
      (client) => client.firestoreId === clientId
    );

    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

    const validStartTime =
      /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime);

    const validHours =
      Number.isFinite(estimatedHours) &&
      estimatedHours >= 0.5 &&
      estimatedHours <= 24;

    const validHelperIds = assignedHelpers.every(
      (helperId) =>
        helpers.some((helper) => helper.uid === helperId)
    );

    if (!selectedClient) {
      alert("Please select a valid client.");
      return;
    }

    if (!validDate) {
      alert("Please enter a valid date.");
      return;
    }

    if (date < today) {
      alert("You cannot schedule a cleaning in the past.");
      return;
    }

    if (!validStartTime) {
      alert("Please enter a valid start time.");
      return;
    }

    if (!validHours) {
      alert(
        "Estimated hours must be between 0.5 and 24."
      );
      return;
    }

    if (!validHelperIds) {
      alert(
        "One or more selected helpers are invalid."
      );
      return;
    }

    if (notes.trim().length > 1000) {
      alert("Notes must be 1,000 characters or fewer.");
      return;
    }

    if (isRecurring) {
      const validEndDate =
        /^\d{4}-\d{2}-\d{2}$/.test(repeatEndDate);

      if (!validEndDate) {
        alert(
          "Please select when the recurring appointments should end."
        );
        return;
      }

      if (repeatEndDate < date) {
        alert(
          "The repeat end date cannot be before the first cleaning."
        );
        return;
      }
    }

    const appointmentDates = generateRecurringDates(
      date,
      repeatEndDate,
      repeatPattern
    );

    if (appointmentDates.length === 0) {
      alert(
        "The appointment dates could not be generated."
      );
      return;
    }

    const conflict = findCleaningConflict({
      dates: appointmentDates,
      clientId,
      startTime,
      estimatedHours,
      existingCleanings: cleanings,
    });

    if (conflict?.type === "same-client") {
      alert(
        `This client already has a cleaning scheduled on ${conflict.date}.`
      );
      return;
    }

    if (conflict?.type === "overlap") {
      alert(
        `The cleaning on ${conflict.date} overlaps with another appointment. Please choose a different time.`
      );
      return;
    }

    const newCleanings: Cleaning[] =
      appointmentDates.map((appointmentDate) => ({
        clientId,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        clientAddress: selectedClient.address,
        clientGateCode: selectedClient.gateCode,
        clientNotes: selectedClient.notes,
        date: appointmentDate,
        startTime,
        estimatedHours,
        assignedHelpers,
        status: "Scheduled",
        notes: notes.trim(),
      }));

    setSaving(true);

    try {
      await addCleanings(newCleanings);
      navigate("/cleanings");
    } catch (error) {
      console.error("Failed to save cleanings:", error);

      setErrorMessage(
        "The cleaning appointments could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/cleanings")}
          className="mb-4 text-sm font-semibold text-[var(--blue-dark)] hover:underline"
        >
          ← Back to Cleanings
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow"
      >
        <h1 className="mb-6 text-2xl font-bold text-[var(--charcoal)]">
          New Cleaning
        </h1>

        <label
          htmlFor="client"
          className="mb-2 block font-medium text-[var(--charcoal)]"
        >
          Client
        </label>

        <select
          id="client"
          value={clientId}
          required
          onChange={(event) =>
            setClientId(event.target.value)
          }
          className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3"
        >
          <option value="">Select a client</option>

          {clients.map((client) => (
            <option
              key={client.firestoreId}
              value={client.firestoreId}
            >
              {client.name}
            </option>
          ))}
        </select>

        <label
          htmlFor="date"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          {isRecurring ? "First Cleaning Date" : "Date"}
        </label>

        <input
          id="date"
          type="date"
          value={date}
          required
          min={today}
          onChange={(event) => {
            const selectedDate = event.target.value;

            setDate(selectedDate);

            if (
              isRecurring &&
              (!repeatEndDate ||
                repeatEndDate < selectedDate)
            ) {
              setRepeatEndDate(selectedDate);
            }
          }}
          className="block w-0 min-w-full max-w-full appearance-none rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        />

        <label
          htmlFor="startTime"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Start Time
        </label>

        <input
          id="startTime"
          type="time"
          value={startTime}
          required
          onChange={(event) =>
            setStartTime(event.target.value)
          }
          className="block w-0 min-w-full max-w-full appearance-none rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        />

        <label
          htmlFor="estimatedHours"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Estimated Hours
        </label>

        <input
          id="estimatedHours"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={estimatedHours}
          required
          onWheel={(event) => event.currentTarget.blur()}
          onChange={(event) =>
            setEstimatedHours(
              Number(event.target.value)
            )
          }
          className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        />

        <label
          htmlFor="repeatPattern"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Repeat
        </label>

        <select
          id="repeatPattern"
          value={repeatPattern}
          onChange={(event) =>
            handleRepeatPatternChange(
              event.target.value as RepeatPattern
            )
          }
          className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        >
          {Object.entries(repeatPatternLabels).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>

        {isRecurring && (
          <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-white p-4">
            <label
              htmlFor="repeatEndDate"
              className="mb-2 block font-medium text-[var(--charcoal)]"
            >
              Repeat Until
            </label>

            <input
              id="repeatEndDate"
              type="date"
              value={repeatEndDate}
              min={date || today}
              required
              onChange={(event) =>
                setRepeatEndDate(event.target.value)
              }
              className="block w-0 min-w-full max-w-full appearance-none rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
            />

            {generatedAppointmentCount > 0 && (
              <p className="mt-3 text-sm text-[var(--muted)]">
                This will create{" "}
                <strong>
                  {generatedAppointmentCount}
                </strong>{" "}
                appointment
                {generatedAppointmentCount === 1
                  ? ""
                  : "s"}
                .
              </p>
            )}
          </div>
        )}

        <label
          htmlFor="notes"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Notes
        </label>

        <textarea
          id="notes"
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          rows={4}
          maxLength={1000}
          className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        />

        <div className="mt-5">
          <p className="mb-2 font-medium text-[var(--charcoal)]">
            Assign Helpers
          </p>

          {helpers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No helpers available.
            </p>
          ) : (
            helpers.map((helper) => (
              <label
                key={helper.uid}
                className="mb-2 flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={assignedHelpers.includes(
                    helper.uid
                  )}
                  onChange={(event) =>
                    handleHelperChange(
                      helper.uid,
                      event.target.checked
                    )
                  }
                />

                <span>{helper.email}</span>
              </label>
            ))
          )}
        </div>

        {errorMessage && (
          <p className="mt-5 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-[var(--blue-dark)] py-3 font-medium text-white transition hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : generatedAppointmentCount > 1
              ? `Save ${generatedAppointmentCount} Cleanings`
              : "Save Cleaning"}
        </button>
      </form>
    </div>
  );
}

export default AddCleaning;