import { useContext, useState } from "react";
import { PaymentContext } from "../context/PaymentContext";
import type { Payment } from "../types/payment";
import {
  calculateHourlyRate,
  calculateNetEarnings,
} from "../utils/paymentCalculations";

function PaymentList() {
  const paymentContext = useContext(PaymentContext);

  if (!paymentContext) {
    throw new Error("PaymentContext not found");
  }

  const { payments, updatePayment, deletePayment } = paymentContext;

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(
    null
  );
  const [editedPayment, setEditedPayment] = useState<Payment | null>(null);

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

  const sortedPayments = [...payments].sort((a, b) =>
    b.cleaningDate.localeCompare(a.cleaningDate)
  );

  if (sortedPayments.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--border-soft)] bg-white p-6">
        <p className="text-sm text-[var(--muted)]">
          No payments recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-xl font-bold text-[var(--charcoal)]">
        Payment History
      </h2>

      {sortedPayments.map((payment) => {
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
            key={payment.firestoreId}
            className="rounded-2xl border border-[var(--border-soft)] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[var(--charcoal)]">
                  {payment.clientName}
                </h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  {new Date(
                    `${payment.cleaningDate}T00:00:00`
                  ).toLocaleDateString()}
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
                  min="0"
                  step="0.01"
                  value={editedPayment.amountCharged}
                  onChange={(event) =>
                    setEditedPayment({
                      ...editedPayment,
                      amountCharged: Number(event.target.value),
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
                  step="0.25"
                  value={editedPayment.actualHours}
                  onChange={(event) =>
                    setEditedPayment({
                      ...editedPayment,
                      actualHours: Number(event.target.value),
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
                  step="0.01"
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
                  className="mt-1 w-full rounded-lg border border-[var(--border-soft)] px-3 py-2"
                />

                <div className="mt-4 flex gap-3">
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
                  ${payment.amountCharged.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-[var(--muted)]">Helper</p>
                <p className="font-semibold">
                  ${payment.helperPayout.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-[var(--muted)]">Net earnings</p>
                <p className="font-semibold">
                  ${netEarnings.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-[var(--muted)]">Hourly rate</p>
                <p className="font-semibold">
                  ${hourlyRate.toFixed(2)}/hr
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
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
      })}
    </div>
  );
}

export default PaymentList;