import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  Clock,
  DollarSign,
  ReceiptText,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { CleaningContext } from "../context/CleaningContext";
import { ClientContext } from "../context/ClientContext";
import { PaymentContext } from "../context/PaymentContext";
import { calculateNetEarnings } from "../utils/paymentCalculations";

type Period =
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year";

type MetricCardProps = {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  className?: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatHours = (hours: number) =>
  `${Number(hours.toFixed(2))} hrs`;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm ${className}`}
    >
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

function Finances() {
  const paymentContext = useContext(PaymentContext);
  const cleaningContext = useContext(CleaningContext);
  const clientContext = useContext(ClientContext);

  if (!paymentContext) {
    throw new Error("PaymentContext not found");
  }

  if (!cleaningContext) {
    throw new Error("CleaningContext not found");
  }

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { payments } = paymentContext;
  const { cleanings } = cleaningContext;
  const { clients } = clientContext;

  const [period, setPeriod] = useState<Period>("this-month");
  const [clientFilter, setClientFilter] = useState("all");

  const now = new Date();
  const today = getLocalDateKey(now);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const lastMonthDate = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const getMonthPrefix = (year: number, month: number) =>
    `${year}-${String(month).padStart(2, "0")}`;

  const matchesPeriod = (date: string) => {
    if (!date) {
      return false;
    }

    if (period === "this-month") {
      return date.startsWith(
        getMonthPrefix(currentYear, currentMonth)
      );
    }

    if (period === "last-month") {
      return date.startsWith(
        getMonthPrefix(
          lastMonthDate.getFullYear(),
          lastMonthDate.getMonth() + 1
        )
      );
    }

    if (period === "this-year") {
      return date.startsWith(String(currentYear));
    }

    return date.startsWith(String(currentYear - 1));
  };

  const matchesClient = (clientId: string) =>
    clientFilter === "all" || clientId === clientFilter;

  const filteredPayments = payments.filter(
    (payment) =>
      matchesPeriod(payment.cleaningDate) &&
      matchesClient(payment.clientId)
  );

  const grossRevenue = filteredPayments.reduce(
    (total, payment) => total + payment.amountCharged,
    0
  );

  const helperPayouts = filteredPayments.reduce(
    (total, payment) => total + payment.helperPayout,
    0
  );

  const netEarnings = filteredPayments.reduce(
    (total, payment) =>
      total +
      calculateNetEarnings(
        payment.amountCharged,
        payment.helperPayout
      ),
    0
  );

  const unpaidPayments = filteredPayments
    .filter((payment) => !payment.paid)
    .sort((first, second) =>
      first.cleaningDate.localeCompare(second.cleaningDate)
    );

  const unpaidBalance = unpaidPayments.reduce(
    (total, payment) => total + payment.amountCharged,
    0
  );

  const hoursWorked = filteredPayments.reduce(
    (total, payment) => total + payment.actualHours,
    0
  );

  const averageHourly =
    hoursWorked > 0 ? netEarnings / hoursWorked : 0;

  /*
   * Cash received is based on the date the client actually paid,
   * not the cleaning date.
   */
  const cashReceived = payments
    .filter(
      (payment) =>
        payment.paid &&
        payment.paidDate &&
        matchesPeriod(payment.paidDate) &&
        matchesClient(payment.clientId)
    )
    .reduce(
      (total, payment) => total + payment.amountCharged,
      0
    );

  /*
   * Projection
   *
   * Saved payment records = actual.
   * Future scheduled cleanings without a payment record = estimate.
   */
  const paymentByCleaningId = new Map(
    payments.map((payment) => [
      payment.cleaningId,
      payment,
    ])
  );

  const remainingScheduledCleanings = cleanings.filter(
    (cleaning) =>
      cleaning.status === "Scheduled" &&
      cleaning.date >= today &&
      matchesPeriod(cleaning.date) &&
      matchesClient(cleaning.clientId) &&
      (
        !cleaning.firestoreId ||
        !paymentByCleaningId.has(cleaning.firestoreId)
      )
  );

  const remainingScheduledNet =
    remainingScheduledCleanings.reduce(
      (total, cleaning) => {
        const client = clients.find(
          (client) =>
            client.firestoreId === cleaning.clientId
        );

        const grossEstimate =
          client?.pricePerCleaning ?? 0;

        const estimatedHelperPayout =
          cleaning.assignedHelpers.length > 0
            ? grossEstimate / 2
            : 0;

        return (
          total +
          calculateNetEarnings(
            grossEstimate,
            estimatedHelperPayout
          )
        );
      },
      0
    );

  const expectedNet =
    netEarnings + remainingScheduledNet;

  /*
   * Actual financial performance grouped by client.
   */
  const clientSummaryMap = new Map<
    string,
    {
      clientId: string;
      clientName: string;
      gross: number;
      helperPayout: number;
      net: number;
      hours: number;
    }
  >();

  filteredPayments.forEach((payment) => {
    const current =
      clientSummaryMap.get(payment.clientId) ?? {
        clientId: payment.clientId,
        clientName:
          payment.clientName || "Unknown client",
        gross: 0,
        helperPayout: 0,
        net: 0,
        hours: 0,
      };

    current.gross += payment.amountCharged;
    current.helperPayout += payment.helperPayout;
    current.net += calculateNetEarnings(
      payment.amountCharged,
      payment.helperPayout
    );
    current.hours += payment.actualHours;

    clientSummaryMap.set(payment.clientId, current);
  });

  const clientSummaries = Array.from(
    clientSummaryMap.values()
  ).sort((first, second) => second.net - first.net);

  const sortedClients = [...clients]
    .filter((client) => client.firestoreId)
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
          Business finances
        </p>

        <h1 className="mt-1 text-3xl font-bold text-[var(--charcoal)]">
          Finances
        </h1>

        <p className="mt-1 text-[var(--muted)]">
          Track your income, hours, and business performance.
        </p>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="finance-period"
              className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
            >
              Period
            </label>

            <select
              id="finance-period"
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target.value as Period
                )
              }
              className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--charcoal)]"
            >
              <option value="this-month">
                This Month
              </option>

              <option value="last-month">
                Last Month
              </option>

              <option value="this-year">
                This Year
              </option>

              <option value="last-year">
                Last Year
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="finance-client"
              className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
            >
              Client
            </label>

            <select
              id="finance-client"
              value={clientFilter}
              onChange={(event) =>
                setClientFilter(event.target.value)
              }
              className="w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 py-3 text-[var(--charcoal)]"
            >
              <option value="all">
                All Clients
              </option>

              {sortedClients.map((client) => (
                <option
                  key={client.firestoreId}
                  value={client.firestoreId}
                >
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main snapshot */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            Financial Snapshot
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Actual payment records for your selected filters.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Your Net"
            value={formatCurrency(netEarnings)}
            note="After helper payouts"
            icon={Wallet}
          />

          <MetricCard
            label="Gross Revenue"
            value={formatCurrency(grossRevenue)}
            note="Total charged"
            icon={DollarSign}
          />

          <MetricCard
            label="Helper Payouts"
            value={formatCurrency(helperPayouts)}
            note="Paid to helpers"
            icon={Banknote}
          />

          <MetricCard
            label="Unpaid"
            value={formatCurrency(unpaidBalance)}
            note="Still owed to you"
            icon={AlertCircle}
          />
        </div>
      </section>

      {/* Performance */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            Performance
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <MetricCard
            label="Hours Worked"
            value={formatHours(hoursWorked)}
            note="Actual hours"
            icon={Clock}
          />

          <MetricCard
            label="Average $ / Hour"
            value={`${formatCurrency(
              averageHourly
            )}/hr`}
            note="Your net divided by hours"
            icon={TrendingUp}
          />

          <MetricCard
            label="Cash Received"
            value={formatCurrency(cashReceived)}
            note="Money actually paid during this period"
            icon={ReceiptText}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      </section>

      {/* Outlook */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            Selected Period Outlook
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Actual earnings plus future work already scheduled.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Earned So Far
              </p>

              <p className="mt-2 text-2xl font-bold text-[var(--charcoal)]">
                {formatCurrency(netEarnings)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Remaining Scheduled
              </p>

              <p className="mt-2 text-2xl font-bold text-[var(--charcoal)]">
                {formatCurrency(
                  remainingScheduledNet
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                Estimated net
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                Expected Total
              </p>

              <p className="mt-2 text-2xl font-bold text-[var(--blue-dark)]">
                {formatCurrency(expectedNet)}
              </p>
            </div>
          </div>

          {remainingScheduledCleanings.length > 0 && (
            <p className="mt-4 border-t border-[var(--border-soft)] pt-4 text-xs text-[var(--muted)]">
              Future cleanings with a helper use an estimated 50/50 split.
            </p>
          )}
        </div>
      </section>

      {/* By Client */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[var(--charcoal)]">
            By Client
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            See which clients are giving you the best return for your time.
          </p>
        </div>

        {clientSummaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-8 text-center">
            <p className="font-semibold text-[var(--charcoal)]">
              No payment records for this period.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {clientSummaries.map((summary) => {
              const hourlyRate =
                summary.hours > 0
                  ? summary.net / summary.hours
                  : 0;

              return (
                <div
                  key={summary.clientId}
                  className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
                >
                  <h3 className="font-bold text-[var(--charcoal)]">
                    {summary.clientName}
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Gross
                      </p>

                      <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {formatCurrency(summary.gross)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Your Net
                      </p>

                      <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {formatCurrency(summary.net)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Hours
                      </p>

                      <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {formatHours(summary.hours)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        Average
                      </p>

                      <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {formatCurrency(hourlyRate)}/hr
                      </p>
                    </div>
                  </div>

                  {summary.helperPayout > 0 && (
                    <p className="mt-4 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--muted)]">
                      Helper payouts:{" "}
                      {formatCurrency(
                        summary.helperPayout
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Outstanding payments */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--charcoal)]">
              Outstanding Payments
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Clients who still owe you money.
            </p>
          </div>

          <Link
            to="/payments"
            className="shrink-0 text-sm font-semibold text-[var(--blue-dark)] hover:underline"
          >
            View Payments
          </Link>
        </div>

        {unpaidPayments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-white p-8 text-center">
            <p className="font-semibold text-[var(--charcoal)]">
              No unpaid payments for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-white shadow-sm">
            {unpaidPayments.map(
              (payment, index) => (
                <div
                  key={
                    payment.firestoreId ??
                    `${payment.clientId}-${payment.cleaningDate}-${index}`
                  }
                  className={`flex items-center justify-between gap-4 p-4 ${
                    index !==
                    unpaidPayments.length - 1
                      ? "border-b border-[var(--border-soft)]"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--charcoal)]">
                      {payment.clientName}
                    </p>

                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Cleaning on{" "}
                      {formatDate(
                        payment.cleaningDate
                      )}
                    </p>
                  </div>

                  <p className="shrink-0 font-bold text-[var(--charcoal)]">
                    {formatCurrency(
                      payment.amountCharged
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Finances;