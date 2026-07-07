import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Navbar from "../components/Navbar";
import { auth } from "../firebase";

type MainLayoutProps = {
  children: React.ReactNode;
};

function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className="bg-[var(--olive-dark)] px-4 py-5 text-white shadow-md">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-[#EDE6D6]">{currentDate}</p>

          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                Mila Cleaning Tracker
              </h1>

              {user && (
                <p className="mt-1 text-sm text-[#EDE6D6]">
                  Logged in as {user.displayName || user.email}
                </p>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[var(--border-soft)] bg-[var(--card)] shadow-sm">
        <div className="mx-auto max-w-6xl">
          <Navbar />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;