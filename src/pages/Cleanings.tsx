import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  KeyRound,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Timer,
  Trash2,
  UserRound,
} from "lucide-react";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { MemberContext } from "../context/MemberContext";

import CleaningCalendar from "../components/CleaningCalendar";

function Cleanings() {
  const navigate = useNavigate();
  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);
  const memberContext = useContext(MemberContext);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();

    return {
      year: today.getFullYear(),
      month: today.getMonth(),
    };
  });

  const [viewMode, setViewMode] = useState<"calendar" | "list">(
    "calendar"
  );

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
  const { role, helpers } = memberContext;

  const isAdmin = role === "admin";

  const selectedMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(
      selectedMonth.year,
      selectedMonth.month,
      1
    )
  );

  const selectedMonthPrefix = `${selectedMonth.year}-${String(
    selectedMonth.month + 1
  ).padStart(2, "0")}`;

  const monthCleanings = cleanings.filter((cleaning) =>
    cleaning.date.startsWith(selectedMonthPrefix)
  );

  const totalEstimatedHours = monthCleanings.reduce(
    (total, cleaning) =>
      cleaning.status === "Cancelled"
        ? total
        : total + cleaning.estimatedHours,
    0
  );

  const totalAppointments = monthCleanings.filter(
    (cleaning) => cleaning.status !== "Cancelled"
  ).length;

  const getClientById = (clientId: string) =>
    clients.find(
      (client) => client.firestoreId === clientId
    );

  const sortedCleanings = [...monthCleanings].sort(
    (a, b) => {
      const first = `${a.date}T${a.startTime}`;
      const second = `${b.date}T${b.startTime}`;

      return first.localeCompare(second);
    }
  );

  const goToPreviousMonth = () => {
    setSelectedMonth((current) => {
      const date = new Date(
        current.year,
        current.month - 1,
        1
      );

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  const goToNextMonth = () => {
    setSelectedMonth((current) => {
      const date = new Date(
        current.year,
        current.month + 1,
        1
      );

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  const formatDateHeading = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));

  const groupedCleanings = sortedCleanings.reduce<
    Record<string, typeof sortedCleanings>
  >((groups, cleaning) => {
    if (!groups[cleaning.date]) {
      groups[cleaning.date] = [];
    }

    groups[cleaning.date].push(cleaning);

    return groups;
  }, {});

  const getAssignedHelperEmails = (
    assignedHelperIds: string[]
  ) =>
    assignedHelperIds
      .map(
        (helperId) =>
          helpers.find(
            (helper) => helper.uid === helperId
          )?.email
      )
      .filter(
        (email): email is string => Boolean(email)
      );

  const renderCleaningList = () => {
    if (sortedCleanings.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-8 text-center">
          <p className="font-semibold text-[var(--charcoal)]">
            No appointments scheduled for{" "}
            {selectedMonthLabel}.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedCleanings).map(
          ([date, dateCleanings]) => (
            <section key={date}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--charcoal)]">
                <CalendarDays size={18} />
                {formatDateHeading(date)}
              </h2>

              <div className="mt-3 space-y-4">
                {dateCleanings.map((cleaning) => {
                  const client = isAdmin
                    ? getClientById(cleaning.clientId)
                    : undefined;

                  const clientName = isAdmin
                    ? client?.name ||
                      cleaning.clientName
                    : cleaning.clientName;

                  const clientAddress = isAdmin
                    ? client?.address ||
                      cleaning.clientAddress
                    : cleaning.clientAddress;

                  const clientPhone = isAdmin
                    ? client?.phone ||
                      cleaning.clientPhone
                    : cleaning.clientPhone;

                  const clientGateCode = isAdmin
                    ? client?.gateCode ||
                      cleaning.clientGateCode
                    : cleaning.clientGateCode;

                  const clientNotes = isAdmin
                    ? client?.notes ||
                      cleaning.clientNotes
                    : cleaning.clientNotes;

                  const assignedHelperEmails =
                    getAssignedHelperEmails(
                      cleaning.assignedHelpers
                    );

                  return (
                    <div
                      key={cleaning.firestoreId}
                      className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
                    >
                      <p className="text-lg font-semibold text-[var(--charcoal)]">
                        {clientName ||
                          "Client unavailable"}
                      </p>

                      {clientAddress ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            clientAddress
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex items-center gap-2 text-[var(--blue-dark)]"
                        >
                          <MapPin size={16} />
                          <span>{clientAddress}</span>
                        </a>
                      ) : (
                        <p className="mt-2 flex items-center gap-2 text-[var(--muted)]">
                          <MapPin size={16} />
                          <span>No address</span>
                        </p>
                      )}

                      <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                        <Phone size={16} />

                        {clientPhone ? (
                          <a href={`tel:${clientPhone}`}>
                            {clientPhone}
                          </a>
                        ) : (
                          <span>No phone number</span>
                        )}
                      </p>

                      {clientGateCode && (
                        <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                          <KeyRound size={18} />
                          <span>
                            Gate/Garage:{" "}
                            {clientGateCode}
                          </span>
                        </p>
                      )}

                      {(clientNotes ||
                        cleaning.notes) && (
                        <div className="mt-2 flex items-start gap-2 text-[var(--blue-dark)]">
                          <MessageSquareText
                            size={18}
                            className="mt-0.5 shrink-0"
                          />

                          <div>
                            {clientNotes && (
                              <p>
                                <span className="font-medium">
                                  Client notes:
                                </span>{" "}
                                {clientNotes}
                              </p>
                            )}

                            {cleaning.notes && (
                              <p>
                                <span className="font-medium">
                                  Appointment notes:
                                </span>{" "}
                                {cleaning.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                        <Clock size={16} />
                        <span>
                          {cleaning.startTime}
                        </span>
                      </p>

                      <p className="mt-1 flex items-center gap-2 text-[var(--blue-dark)]">
                        <Timer size={18} />
                        <span>
                          {cleaning.estimatedHours}{" "}
                          {cleaning.estimatedHours === 1
                            ? "hour"
                            : "hours"}
                        </span>
                      </p>

                      {isAdmin && (
                        <p className="mt-1 flex items-start gap-2 text-[var(--blue-dark)]">
                          <UserRound
                            size={18}
                            className="mt-0.5 shrink-0"
                          />

                          <span>
                            {assignedHelperEmails.length >
                            0
                              ? assignedHelperEmails.join(
                                  ", "
                                )
                              : "No helper assigned"}
                          </span>
                        </p>
                      )}

                      {isAdmin &&
                        cleaning.firestoreId && (
                          <div className="mt-4 flex flex-wrap gap-4">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/cleanings/${cleaning.firestoreId}/edit`
                                )
                              }
                              className="flex items-center gap-2 text-sm font-medium text-[var(--blue-dark)] hover:underline"
                            >
                              <Pencil size={16} />
                              Edit Cleaning
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                const firestoreId =
                                  cleaning.firestoreId;

                                if (!firestoreId) {
                                  return;
                                }

                                const confirmed =
                                  window.confirm(
                                    "Delete this cleaning? This cannot be undone."
                                  );

                                if (!confirmed) {
                                  return;
                                }

                                await deleteCleaning(
                                  firestoreId
                                );
                              }}
                              className="flex items-center gap-2 text-sm font-medium text-red-700 hover:underline"
                            >
                              <Trash2 size={16} />
                              Delete Cleaning
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </section>
          )
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--charcoal)]">
          {isAdmin
            ? selectedMonthLabel
            : `My Cleanings — ${selectedMonthLabel}`}
        </h1>

        {isAdmin && (
          <Link
            to="/cleanings/new"
            className="flex items-center gap-2 rounded-xl bg-[var(--blue-dark)] px-3 py-3 text-md font-medium text-white transition hover:bg-[var(--blue)]"
          >
            New Cleaning
          </Link>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-[var(--cream)] p-3">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="flex items-center gap-1 font-medium text-[var(--blue-dark)]"
        >
          <ChevronLeft size={18} />
          Previous
        </button>

        <span className="font-semibold text-[var(--charcoal)]">
          {selectedMonthLabel}
        </span>

        <button
          type="button"
          onClick={goToNextMonth}
          className="flex items-center gap-1 font-medium text-[var(--blue-dark)]"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      {isAdmin && (
        <div className="mb-4 flex rounded-xl border border-[var(--border-soft)] bg-white p-1">
          <button
            type="button"
            onClick={() =>
              setViewMode("calendar")
            }
            aria-pressed={
              viewMode === "calendar"
            }
            className={`w-1/2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              viewMode === "calendar"
                ? "bg-[var(--blue-dark)] text-white"
                : "text-[var(--blue-dark)]"
            }`}
          >
            Calendar
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={`w-1/2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              viewMode === "list"
                ? "bg-[var(--blue-dark)] text-white"
                : "text-[var(--blue-dark)]"
            }`}
          >
            List
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
            Appointments
          </p>

          <p className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
            {totalAppointments}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
            Estimated Hours
          </p>

          <p className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
            {totalEstimatedHours}
          </p>
        </div>
      </div>

      {isAdmin && viewMode === "calendar" ? (
        <CleaningCalendar
          year={selectedMonth.year}
          month={selectedMonth.month}
          cleanings={monthCleanings}
          clients={clients}
          isAdmin
          onEdit={(firestoreId) =>
            navigate(
              `/cleanings/${firestoreId}/edit`
            )
          }
        />
      ) : (
        renderCleaningList()
      )}
    </div>
  );
}

export default Cleanings;