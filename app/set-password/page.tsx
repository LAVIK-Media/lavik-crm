"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        newPassword,
        confirmPassword,
      }),
    });

    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[color:var(--lavik-bg)] px-4 py-10 text-[color:var(--lavik-text)]">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-2xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-[color:var(--lavik-text-strong)]">
              Set your password
            </h1>
            <p className="mt-1 text-sm text-[color:var(--lavik-text)]/80">
              Choose a personal password for future logins (min. 8 characters).
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="text-sm font-medium">New password</span>
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)]/20 px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none ring-0 placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)]/20 px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none ring-0 placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-[color:var(--lavik-primary)] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:bg-[color:var(--lavik-accent-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--lavik-glow)] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Set password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
