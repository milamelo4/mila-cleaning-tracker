import { useContext, useState } from "react";
import { ClientContext } from "../context/ClientContext";
import { MemberContext } from "../context/MemberContext";
import { useNavigate } from "react-router-dom";
import { CleaningContext } from "../context/CleaningContext";

function AddCleaning() {
    const clientContext = useContext(ClientContext);
    const memberContext = useContext(MemberContext);
    const cleaningContext = useContext(CleaningContext);
    const navigate = useNavigate();
    const [clientId, setClientId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [estimatedHours, setEstimatedHours] = useState(0);
    const [notes, setNotes] = useState("");
    const [assignedHelpers, setAssignedHelpers] = useState<string[]>([]);

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
    const { addCleaning } = cleaningContext;

    const now = new Date();

    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

   const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
    ) => {
    event.preventDefault();

    const selectedClientExists = clients.some(
        (client) => client.firestoreId === clientId
    );

    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const validStartTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime);

    const validHours =
        Number.isFinite(estimatedHours) &&
        estimatedHours >= 0.5 &&
        estimatedHours <= 24;

    const validHelperIds = assignedHelpers.every((helperId) =>
        helpers.some((helper) => helper.uid === helperId)
    );

    if (!selectedClientExists) {
        alert("Please select a valid client.");
        return;
    }

    if (!validDate) {
        alert("Please enter a valid date.");
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

    if (date < today) {
        alert("You cannot schedule a cleaning in the past.");
        return;
    }

    await addCleaning({
        clientId,
        date,
        startTime,
        estimatedHours,
        assignedHelpers,
        status: "Scheduled",
        notes,
    });

    navigate("/cleanings");
    };

    return (
        
        <div>
            <div className="mx-auto w-full max-w-2xl">
                <button
                    onClick={() => navigate("/cleanings")}
                    className="text-sm font-semibold text-[var(--blue-dark)] hover:underline mb-4"
                >
                    ← Back to Cleanings
                </button>
            </div>
            
            <form
            onSubmit={handleSubmit}
            className="max-w-2xl rounded-lg border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow"
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
                onChange={(event) => setClientId(event.target.value)}
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
                type="date"
                value={date}
                required
                min={today}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
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
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
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
                min="0"
                max="24"
                step="0.5"
                value={estimatedHours}
                required
                onChange={(event) => setEstimatedHours(Number(event.target.value))}
                className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
                />
                <label
                htmlFor="notes"
                className="mb-2 mt-5 block font-medium text-[var(--charcoal)]"
                >
                Notes
                </label>
                <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full rounded-md border border-[var(--border-soft)] bg-white px-4 py-3"
                />
                <div className="mt-5">
                    <p className="mb-2 font-medium text-[var(--charcoal)]">
                        Assign Helpers
                    </p>
                    {helpers.map((helper) => (
                        <label
                        key={helper.uid}
                        className="mb-2 flex items-center gap-3"
                        >
                        <input
                            type="checkbox"
                            required
                            checked={assignedHelpers.includes(helper.uid)}
                            onChange={(event) => {
                            if (event.target.checked) {
                                setAssignedHelpers((current) => [
                                ...current,
                                helper.uid,
                                ]);
                            } else {
                                setAssignedHelpers((current) =>
                                current.filter((uid) => uid !== helper.uid)
                                );
                            }
                            }}
                        />
                            <span>{helper.email}</span>
                        </label>
                    ))}
                </div>
                <button
                type="submit"
                className="mt-6 w-full rounded-xl bg-[var(--blue-dark)] py-3 font-medium text-white transition hover:bg-[var(--blue)]"
                >
                Save Cleaning
                </button>
            </form>
        </div>
    );
}

export default AddCleaning;