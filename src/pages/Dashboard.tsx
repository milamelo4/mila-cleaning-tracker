import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { askAssistant } from "../services/assistantService";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Users,
  type LucideIcon,
} from "lucide-react";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { PaymentContext } from "../context/PaymentContext";



type MetricCardProps = {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));

const getLocalDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
            {label}
          </p>

          <p className="mt-2 text-xl font-bold text-[var(--charcoal)]">
            {value}
          </p>

          {note && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {note}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cream)] text-[var(--blue-dark)]">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);
  const paymentContext = useContext(PaymentContext);

  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);

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
    const { payments } = paymentContext;

    const now = new Date();
    const today = getLocalDateKey(now);

    const currentYear = String(now.getFullYear());
    const currentMonth = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const currentMonthPrefix =
      `${currentYear}-${currentMonth}`;

    const currentMonthLabel =
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(now);

    const activeClients = clients.filter(
      (client) => client.active
    ).length;

    const monthCleanings = cleanings.filter(
      (cleaning) =>
        cleaning.date.startsWith(currentMonthPrefix) &&
        cleaning.status !== "Cancelled"
    );

    const completedThisMonth = monthCleanings.filter(
      (cleaning) => cleaning.status === "Completed"
    ).length;

  const upcomingCleanings = cleanings
    .filter(
      (cleaning) =>
        cleaning.status === "Scheduled" &&
        cleaning.date >= today
    )
    .sort((first, second) =>
      `${first.date}T${first.startTime}`.localeCompare(
        `${second.date}T${second.startTime}`
      )
    );

    const nextCleanings = upcomingCleanings.slice(0, 5);

    const unpaidPayments = payments.filter(
      (payment) => !payment.paid
  );

  const unpaidBalance = unpaidPayments.reduce(
    (total, payment) =>
      total + payment.amountCharged,
    0
  );

  const getClientById = (clientId: string) =>
    clients.find(
      (client) => client.firestoreId === clientId
    );

  const handleAskAssistant = async () => {
    const question = assistantQuestion.trim();

    if (!question) {
      return;
    }

    setAssistantLoading(true);
    setAssistantAnswer("");

    try {
      const answer = await askAssistant(question);
      setAssistantAnswer(answer);
    } catch (error) {
      console.error(error);
      setAssistantAnswer(
        "Something went wrong. Please try again."
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
            Business overview
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[var(--charcoal)]">
            Dashboard
          </h1>

          <p className="mt-1 text-[var(--muted)]">
            {currentMonthLabel}
          </p>
        </div>

        <Link
          to="/finances"
          className="flex items-center gap-2 rounded-xl bg-[var(--blue-dark)] px-4 py-3 font-medium text-white transition hover:bg-[var(--blue)]"
        >
          View finances
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Mila Assistant */}
<section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm">
  <h2 className="text-xl font-bold text-[var(--charcoal)]">
    Mila Assistant
  </h2>

  <p className="mt-1 text-sm text-[var(--muted)]">
    Ask a question about your cleaning business.
  </p>

  <div className="mt-4 space-y-3">
    <textarea
      value={assistantQuestion}
      onChange={(event) =>
        setAssistantQuestion(event.target.value)
      }
      placeholder="Ask me something..."
      rows={3}
      className="w-full rounded-xl border border-[var(--border-soft)] p-3 outline-none focus:border-[var(--blue)]"
    />

    <button
      type="button"
      onClick={handleAskAssistant}
      disabled={assistantLoading}
      className="rounded-xl bg-[var(--blue-dark)] px-4 py-3 font-medium text-white disabled:opacity-50"
    >
      {assistantLoading ? "Thinking..." : "Ask Mila"}
    </button>

    {assistantAnswer && (
      <div className="rounded-xl bg-[var(--cream)] p-4 text-sm text-[var(--charcoal)]">
        {assistantAnswer}
      </div>
    )}
  </div>
</section>

      {/* Business Snapshot */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            Business Snapshot
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            A quick look at your clients and schedule.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Active Clients"
            value={String(activeClients)}
            icon={Users}
          />

          <MetricCard
            label="Appointments"
            value={String(monthCleanings.length)}
            note="This month"
            icon={CalendarDays}
          />

          <MetricCard
            label="Completed"
            value={String(completedThisMonth)}
            note="This month"
            icon={CheckCircle2}
          />

          <MetricCard
            label="Upcoming"
            value={String(upcomingCleanings.length)}
            note="Scheduled"
            icon={Clock}
          />
        </div>
      </section>

      {/* Attention */}
      {unpaidPayments.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[var(--charcoal)]">
              Needs Attention
            </h2>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
                  Unpaid Client Balance
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {formatCurrency(unpaidBalance)}
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  {unpaidPayments.length}{" "}
                  {unpaidPayments.length === 1
                    ? "payment is"
                    : "payments are"}{" "}
                  still unpaid.
                </p>
              </div>

              <Link
                to="/payments"
                className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
              >
                Review payments
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Next Cleanings */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--charcoal)]">
              Next Cleanings
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Your next five scheduled appointments.
            </p>
          </div>

          <Link
            to="/cleanings"
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--blue-dark)] hover:underline"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        {nextCleanings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-8 text-center">
            <p className="font-semibold text-[var(--charcoal)]">
              No upcoming cleanings are scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nextCleanings.map((cleaning) => {
              const client = getClientById(
                cleaning.clientId
              );

              return (
                <div
                  key={
                    cleaning.firestoreId ??
                    `${cleaning.clientId}-${cleaning.date}-${cleaning.startTime}`
                  }
                  className="rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--charcoal)]">
                        {client?.name ??
                          cleaning.clientName ??
                          "Client unavailable"}
                      </p>

                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDate(cleaning.date)} at{" "}
                        {cleaning.startTime}
                      </p>
                    </div>

                    <span className="rounded-full bg-[var(--cream)] px-3 py-1 text-xs font-semibold text-[var(--blue-dark)]">
                      {cleaning.estimatedHours}{" "}
                      {cleaning.estimatedHours === 1
                        ? "hour"
                        : "hours"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {cleaning.assignedHelpers.length > 0
                      ? `${cleaning.assignedHelpers.length} helper assigned`
                      : "No helper assigned"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;