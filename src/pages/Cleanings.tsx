import { useContext } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Timer,
  Trash2,
} from "lucide-react";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { MemberContext } from "../context/MemberContext";

function Cleanings() {
  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);
  const memberContext = useContext(MemberContext);

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { cleanings, deleteCleaning } = cleaningContext;
  const { clients } = clientContext;
  const { role } = memberContext;

  const getClientById = (clientId: string) =>
    clients.find((client) => client.firestoreId === clientId);

  const sortedCleanings = [...cleanings].sort((a, b) => {
  const first = `${a.date}T${a.startTime}`;
  const second = `${b.date}T${b.startTime}`;

  return first.localeCompare(second);
});

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--charcoal)]">
          Cleanings ({cleanings.length})
        </h1>

        {role === "admin" && (
          <Link
            to="/cleanings/new"
            className="rounded-xl bg-[var(--blue-dark)] px-4 py-3 font-medium text-white transition hover:bg-[var(--blue)]"
          >
            New Cleaning
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {sortedCleanings.map((cleaning) => {
          const client = getClientById(cleaning.clientId);

          return (
            <div
              key={cleaning.firestoreId}
              className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
            >
              <p className="text-lg font-semibold text-[var(--charcoal)]">
                {client?.name ?? "Client unavailable"}
              </p>

              {client?.address ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    client.address
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-2 text-[var(--blue-dark)]"
                >
                  <MapPin size={16} />
                  <span>{client.address}</span>
                </a>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-[var(--muted)]">
                  <MapPin size={16} />
                  <span>No address</span>
                </p>
              )}

              <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                <Phone size={16} />

                {client?.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="text-[var(--blue-dark)]"
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span>No phone number</span>
                )}
              </p>

              <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                <CalendarDays size={16} />
                <span>{cleaning.date}</span>
              </p>

              <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                <Clock size={16} />
                <span>{cleaning.startTime}</span>
              </p>

              <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                <Timer size={18} />
                <span>{cleaning.estimatedHours} hours</span>
              </p>

              {role === "admin" && cleaning.firestoreId && (
                <button
                  type="button"
                  onClick={async () => {
                const firestoreId = cleaning.firestoreId;

                if (!firestoreId) return;

                const confirmed = window.confirm(
                  "Delete this cleaning? This cannot be undone."
                );

                if (!confirmed) return;

                await deleteCleaning(firestoreId);
              }}
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-red-700 hover:underline"
                >
                  <Trash2 size={16} />
                  Delete Cleaning
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Cleanings;