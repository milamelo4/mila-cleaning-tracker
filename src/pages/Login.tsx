import {
  useContext,
  useState,
} from "react";
import {
  Navigate,
} from "react-router-dom";
import {
  signInWithPopup,
} from "firebase/auth";
import {
  useAuthState,
} from "react-firebase-hooks/auth";

import {
  auth,
  googleProvider,
} from "../firebase";
import { MemberContext } from "../context/MemberContext";

function Login() {
  const [signingIn, setSigningIn] =
    useState(false);

  const [user, loadingUser] =
    useAuthState(auth);

  const memberContext =
    useContext(MemberContext);

  if (!memberContext) {
    throw new Error(
      "MemberContext not found"
    );
  }

  const { role, loadingRole } =
    memberContext;

  const handleGoogleLogin = async () => {
    setSigningIn(true);

    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(
        "Google login failed:",
        error
      );
    } finally {
      setSigningIn(false);
    }
  };

  if (
    loadingUser ||
    signingIn ||
    (user && loadingRole)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
        <p className="text-[var(--muted)]">
          Checking login...
        </p>
      </div>
    );
  }

  if (user && role === "admin") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  if (user && role === "helper") {
    return (
      <Navigate
        to="/cleanings"
        replace
      />
    );
  }

  if (user && !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-[var(--border-soft)] bg-white/70 p-8 text-center shadow-xl backdrop-blur-xl">
          <p className="text-[var(--muted)]">
            Your account does not have access yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
      <div className="relative flex min-h-[430px] w-full max-w-lg flex-col justify-center rounded-3xl border border-[var(--border-soft)] bg-white/70 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-[var(--blue)]">
            Mila Cleaning Tracker
          </p>

          <h1 className="text-3xl font-bold text-[var(--charcoal)]">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to access your cleaning schedule.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-[var(--blue-dark)] py-3 font-semibold text-white shadow-md transition hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--blue-dark)]">
            G
          </span>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Access is limited to approved team members.
        </p>
      </div>
    </div>
  );
}

export default Login;