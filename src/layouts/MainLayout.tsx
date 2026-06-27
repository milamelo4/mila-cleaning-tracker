import Navbar from "../components/Navbar";

type MainLayoutProps = {
  children: React.ReactNode;
};

function MainLayout({ children }: MainLayoutProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-6 py-6 text-white shadow-md">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-300">{currentDate}</p>
          <h1 className="mt-1 text-3xl font-bold">
            Mila Cleaning Tracker
          </h1>
        </div>
      </header>

      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-6xl">
          <Navbar />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;