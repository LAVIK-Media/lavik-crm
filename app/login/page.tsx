import { Suspense } from "react";

import LoginForm from "./ui";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[color:var(--lavik-bg)] px-4 py-10 text-[color:var(--lavik-text)]">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-2xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-[color:var(--lavik-text-strong)]">
              LAVIK-Media CRM
            </h1>
            <p className="mt-1 text-sm text-[color:var(--lavik-text)]/80">
              Sign in to manage leads for cold calling.
            </p>
          </div>

          <Suspense fallback={<div className="h-[172px]" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

