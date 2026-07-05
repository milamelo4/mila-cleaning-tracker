function Login() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cream)] px-4 py-10">
      <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--olive)] opacity-20 blur-3xl" />
      <div className="absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-[var(--soft)] opacity-80 blur-3xl" />

      <div className="relative flex min-h-[430px] w-full max-w-lg flex-col justify-center rounded-3xl border border-[var(--border-soft)] bg-white/70 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-[var(--olive)]">
            Mila Cleaning Tracker
          </p>

          <h1 className="text-3xl font-bold text-[var(--charcoal)]">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to safely access your client information.
          </p>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-full bg-[var(--olive-dark)] py-3 font-semibold text-white shadow-md transition hover:bg-[var(--olive)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--olive-dark)]">
            G
          </span>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Your client information stays private and protected.
        </p>
      </div>
    </div>
  );
}

export default Login;