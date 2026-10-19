import PaymentForm from "../components/PaymentForm";
import PaymentList from "../components/PaymentList";

function Payments() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--charcoal)]">
          Payments
        </h1>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Track what clients paid, helper payouts, and your earnings.
        </p>
      </div>

      <PaymentForm />
      <PaymentList />
    </div>
  );
}

export default Payments;