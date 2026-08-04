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

const formatMonthHeading = (monthKey: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T00:00:00`));
};

function PaymentList() {
  const paymentContext = useContext(PaymentContext);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(
    null
  );
  const [editedPayment, setEditedPayment] = useState<Payment | null>(null);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [clientSearch, setClientSearch] = useState("");

  if (!paymentContext) {
    throw new Error("PaymentContext not found");
  }

  const { payments, updatePayment, deletePayment } = paymentContext;

  const availableYears = Array.from(
    new Set(
      payments.map((payment) =>
        payment.cleaningDate.slice(0, 4)
      )
    )
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

  const filteredPayments = payments.filter((payment) => {
    const paymentYear = payment.cleaningDate.slice(0, 4);
    const paymentMonth = payment.cleaningDate.slice(5, 7);

    const matchesYear =
      selectedYear === "all" || paymentYear === selectedYear;

    const matchesMonth =
      selectedMonth === "all" || paymentMonth === selectedMonth;

    const matchesClient = payment.clientName
      .toLowerCase()
      .includes(clientSearch.trim().toLowerCase());

    return matchesYear && matchesMonth && matchesClient;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) =>
    b.cleaningDate.localeCompare(a.cleaningDate)
  );

  const groupedPayments = sortedPayments.reduce<
    Record<string, Payment[]>
  >((groups, payment) => {
    const monthKey = payment.cleaningDate.slice(0, 7);

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }

    groups[monthKey].push(payment);

    return groups;
  }, {});

  const paymentGroups = Object.entries(groupedPayments).sort(
    ([firstMonth], [secondMonth]) =>
      secondMonth.localeCompare(firstMonth)
  );

  return (
    <div className="mt-6 space-y-6">
      <h2 className="text-xl font-bold text-[var(--charcoal)]">
        Payment History
      </h2>

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
              <option value="all">All years</option>

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
              <option value="all">All months</option>

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

      {paymentGroups.length === 0 && (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-6">
          <p className="text-sm text-[var(--muted)]">
            No payments match the selected filters.
          </p>
        </div>
      )}

      {paymentGroups.map(([monthKey, monthPayments]) => {
        const monthTotals = monthPayments.reduce(
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

        return (
          <section key={monthKey} className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--cream)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-[var(--charcoal)]">
                  {formatMonthHeading(monthKey)}
                </h3>

                <p className="text-sm text-[var(--muted)]">
                  {monthPayments.length}{" "}
                  {monthPayments.length === 1
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
                  <p className="text-xs text-[var(--muted)]">
                    Paid
                  </p>
                  <p className="mt-1 font-bold text-green-700">
                    {formatCurrency(monthTotals.paid)}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-[var(--muted)]">
                    Unpaid
                  </p>
                  <p className="mt-1 font-bold text-amber-700">
                    {formatCurrency(monthTotals.unpaid)}
                  </p>
                </div>
              </div>
            </div>

            {monthPayments.map((payment) => {
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
                      <label className="block text-sm font-medium text-[var(--charcoal)]">
                        Amount charged
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        onWheel={(event) => event.currentTarget.blur()}
                        value={editedPayment.amountCharged}
                        onChange={(event) =>
                          setEditedPayment({
                            ...editedPayment,
                            amountCharged: Number(
                              event.target.value
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
                      />

                      <label className="mt-4 block text-sm font-medium text-[var(--charcoal)]">
                        Actual hours
                      </label>

                      <input
                        type="number"
                        min="0.25"
                        max="24"
                        step="0.25"
                        onWheel={(event) => event.currentTarget.blur()}
                        value={editedPayment.actualHours}
                        onChange={(event) =>
                          setEditedPayment({
                            ...editedPayment,
                            actualHours: Number(
                              event.target.value
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
                      />

                      <label className="mt-4 block text-sm font-medium text-[var(--charcoal)]">
                        Helper payout
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={editedPayment.amountCharged}
                        step="0.01"
                        onWheel={(event) => event.currentTarget.blur()}
                        value={editedPayment.helperPayout}
                        onChange={(event) =>
                          setEditedPayment({
                            ...editedPayment,
                            helperPayout: Number(
                              event.target.value
                            ),
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
                                  new Date()
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                            })
                          }
                        />

                        Paid
                      </label>

                      {editedPayment.paid && (
                        <>
                          <label className="mt-4 block text-sm font-medium text-[var(--charcoal)]">
                            Paid date
                          </label>

                          <input
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

                      <label className="mt-4 block text-sm font-medium text-[var(--charcoal)]">
                        Notes
                      </label>

                      <textarea
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
                      <p className="text-[var(--muted)]">
                        Charged
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(payment.amountCharged)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[var(--muted)]">
                        Helper
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(payment.helperPayout)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[var(--muted)]">
                        Net earnings
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(netEarnings)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[var(--muted)]">
                        Hourly rate
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(hourlyRate)}/hr
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleStartEditing(payment)
                      }
                      className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--charcoal)] hover:bg-gray-50"
                    >
                      Edit payment
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(payment.firestoreId)
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete payment
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export default PaymentList;