"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "").trim();

    const body = new URLSearchParams({ email, password });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    setPending(false);

    if (!res.ok) {
      setError("Invalid email or password.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data.mustSetPassword) {
      router.replace("/set-password");
      return;
    }
    router.replace(nextPath);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)]/20 px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none ring-0 placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)]/20 px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none ring-0 placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : <div />}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[color:var(--lavik-primary)] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:bg-[color:var(--lavik-accent-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--lavik-glow)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

