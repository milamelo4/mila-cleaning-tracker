import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { MemberContext } from "../context/MemberContext";
import type { Cleaning } from "../types/cleaning";

function EditCleaning() {
  const navigate = useNavigate();
  const { cleaningId } = useParams();

  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);
  const memberContext = useContext(MemberContext);

  const [cleaning, setCleaning] = useState<Cleaning | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCleaning = cleaningContext?.cleanings.find(
    (savedCleaning) => savedCleaning.firestoreId === cleaningId
  );

  useEffect(() => {
    if (selectedCleaning) {
      setCleaning({ ...selectedCleaning });
    }
  }, [selectedCleaning]);

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { cleanings, updateCleaning } = cleaningContext;
  const { clients } = clientContext;
  const { helpers } = memberContext;

  if (!selectedCleaning) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-6">
        <p className="text-[var(--muted)]">Cleaning not found.</p>

        <button
          type="button"
          onClick={() => navigate("/cleanings")}
          className="mt-4 font-semibold text-[var(--blue-dark)] hover:underline"
        >
          Back to Cleanings
        </button>
      </div>
    );
  }

  if (!cleaning) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-6">
        <p className="text-[var(--muted)]">Loading cleaning...</p>
      </div>
    );
  }

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setCleaning((current) => {
      if (!current) return current;

      if (name === "estimatedHours") {
        return {
          ...current,
          estimatedHours: Number(value),
        };
      }

      if (name === "clientId") {
        return {
          ...current,
          clientId: value,
        };
      }

      if (name === "date") {
        return {
          ...current,
          date: value,
        };
      }

      if (name === "startTime") {
        return {
          ...current,
          startTime: value,
        };
      }

      if (name === "status") {
        return {
          ...current,
          status: value as Cleaning["status"],
        };
      }

      if (name === "notes") {
        return {
          ...current,
          notes: value,
        };
      }

      return current;
    });
  };

  const toggleHelper = (helperId: string, checked: boolean) => {
    setCleaning((current) => {
      if (!current) return current;

      return {
        ...current,
        assignedHelpers: checked
          ? [...current.assignedHelpers, helperId]
          : current.assignedHelpers.filter(
              (savedHelperId) => savedHelperId !== helperId
            ),
      };
    });
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    const selectedClientExists = clients.some(
      (client) => client.firestoreId === cleaning.clientId
    );

    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(cleaning.date);

    const validStartTime =
      /^([01]\d|2[0-3]):[0-5]\d$/.test(cleaning.startTime);

    const validHours =
      Number.isFinite(cleaning.estimatedHours) &&
      cleaning.estimatedHours >= 0.5 &&
      cleaning.estimatedHours <= 24;

    const validHelperIds = cleaning.assignedHelpers.every(
      (helperId) =>
        helpers.some((helper) => helper.uid === helperId)
    );

    const validStatuses: Cleaning["status"][] = [
      "Scheduled",
      "Completed",
      "Cancelled",
    ];

    if (!cleaning.firestoreId) {
      alert("Cleaning Firestore ID is missing.");
      return;
    }

    if (!selectedClientExists) {
      alert("Please select a valid client.");
      return;
    }

    if (!validDate) {
      alert("Please enter a valid date.");
      return;
    }

    if (cleaning.date < today) {
      alert("You cannot schedule a cleaning in the past.");
      return;
    }

    if (!validStartTime) {
      alert("Please enter a valid start time.");
      return;
    }

    if (!validHours) {
      alert("Estimated hours must be between 0.5 and 24.");
      return;
    }

    if (!validHelperIds) {
      alert("One or more selected helpers are invalid.");
      return;
    }

    if (!validStatuses.includes(cleaning.status)) {
      alert("Please select a valid cleaning status.");
      return;
    }

    if (cleaning.notes.trim().length > 1000) {
      alert("Notes must be 1,000 characters or fewer.");
      return;
    }

    if (cleaning.status !== "Cancelled") {
      const sameClientSameDay = cleanings.some(
        (savedCleaning) =>
          savedCleaning.firestoreId !== cleaning.firestoreId &&
          savedCleaning.clientId === cleaning.clientId &&
          savedCleaning.date === cleaning.date &&
          savedCleaning.status !== "Cancelled"
      );

      if (sameClientSameDay) {
        alert(
          "This client already has a cleaning scheduled for this date."
        );
        return;
      }

      const newStart = timeToMinutes(cleaning.startTime);
      const newEnd =
        newStart + cleaning.estimatedHours * 60;

      const overlappingCleaning = cleanings.some(
        (savedCleaning) => {
          if (
            savedCleaning.firestoreId === cleaning.firestoreId ||
            savedCleaning.date !== cleaning.date ||
            savedCleaning.status === "Cancelled"
          ) {
            return false;
          }

          const existingStart = timeToMinutes(
            savedCleaning.startTime
          );

          const existingEnd =
            existingStart +
            savedCleaning.estimatedHours * 60;

          return (
            newStart < existingEnd &&
            newEnd > existingStart
          );
        }
      );

      if (overlappingCleaning) {
        alert(
          "This cleaning overlaps with another cleaning on the same date. Please choose a different time."
        );
        return;
      }
    }

    setSaving(true);

    try {
      await updateCleaning({
        ...cleaning,
        notes: cleaning.notes.trim(),
      });

      navigate("/cleanings");
    } catch (error) {
      console.error("Failed to update cleaning:", error);
      setErrorMessage(
        "The cleaning could not be updated. Please try again."
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
          Edit Cleaning
        </h1>

        <label
          htmlFor="clientId"
          className="mb-2 block font-medium text-[var(--charcoal)]"
        >
          Client
        </label>

        <select
          id="clientId"
          name="clientId"
          value={cleaning.clientId}
          onChange={handleChange}
          required
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
          Date
        </label>

        <input
          id="date"
          name="date"
          type="date"
          value={cleaning.date}
          min={today}
          onChange={handleChange}
          required
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
          name="startTime"
          type="time"
          value={cleaning.startTime}
          onChange={handleChange}
          required
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
          name="estimatedHours"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={cleaning.estimatedHours}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        />

        <label
          htmlFor="status"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Status
        </label>

        <select
          id="status"
          name="status"
          value={cleaning.status}
          onChange={handleChange}
          required
          className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
        >
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <label
          htmlFor="notes"
          className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
        >
          Notes
        </label>

        <textarea
          id="notes"
          name="notes"
          value={cleaning.notes}
          onChange={handleChange}
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
                  checked={cleaning.assignedHelpers.includes(
                    helper.uid
                  )}
                  onChange={(event) =>
                    toggleHelper(
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

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/cleanings")}
            disabled={saving}
            className="w-full rounded-xl border border-[var(--border-soft)] py-3 font-medium text-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--blue-dark)] py-3 font-medium text-white transition hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditCleaning;