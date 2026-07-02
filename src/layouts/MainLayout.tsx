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
    <div className="min-h-screen bg-[#F7F3EA]">
  <header className="bg-[var(--olive-dark)] px-4 py-5 text-white shadow-md">
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-[#EDE6D6]">{currentDate}</p>
      <h1 className="mt-1 text-3xl font-bold">
        Mila Cleaning Tracker
      </h1>
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