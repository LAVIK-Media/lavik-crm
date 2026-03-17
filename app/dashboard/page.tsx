import LeadBoard from "@/components/LeadBoard";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[color:var(--lavik-bg)] px-4 py-8 text-[color:var(--lavik-text)]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[color:var(--lavik-text-strong)]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[color:var(--lavik-text)]/80">
              Leads and clients for cold calling.
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:border-[color:var(--lavik-accent)]"
            >
              Logout
            </button>
          </form>
        </header>

        <LeadBoard />
      </div>
    </div>
  );
}

