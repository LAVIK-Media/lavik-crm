"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";

import type { Lead, LeadStatus } from "@/lib/crm-types";

function toTelHref(phone: string) {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : undefined;
}

type ViewKey = "NEW" | "IN_PROGRESS" | "CLOSED" | "ARCHIVED";

const VIEWS: Array<{ key: ViewKey; label: string; statuses: LeadStatus[] }> = [
  { key: "NEW", label: "New Leads", statuses: ["NEW"] },
  {
    key: "IN_PROGRESS",
    label: "Contacted / In Progress",
    statuses: ["CONTACTED", "INTERESTED"],
  },
  { key: "CLOSED", label: "Closed Deals", statuses: ["CLOSED"] },
  { key: "ARCHIVED", label: "Archived", statuses: ["NO_INTEREST"] },
];

const ALL_STATUSES: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CLOSED", label: "Closed" },
  { value: "NO_INTEREST", label: "No interest" },
];

async function fetcher(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json as { leads: Lead[] };
}

function statusParam(statuses: LeadStatus[]) {
  return statuses.join(",");
}

type LeadDraft = {
  companyName: string;
  phoneNumber: string;
  website?: string;
  contactPerson?: string;
  notes?: string;
  status?: LeadStatus;
};

export default function LeadBoard() {
  const [view, setView] = useState<ViewKey>("NEW");
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<
    | { mode: "create"; initial?: Partial<LeadDraft> }
    | { mode: "edit"; lead: Lead }
    | null
  >(null);

  const active = useMemo(
    () => VIEWS.find((v) => v.key === view) ?? VIEWS[0],
    [view],
  );

  const url = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("status", statusParam(active.statuses));
    if (q.trim()) sp.set("q", q.trim());
    return `/api/leads?${sp.toString()}`;
  }, [active.statuses, q]);

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    keepPreviousData: true,
  });

  const leads = data?.leads ?? [];

  async function createLead(draft: LeadDraft) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "Create failed");
    await mutate();
  }

  async function updateLead(id: string, patch: Partial<LeadDraft>) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "Update failed");
    await mutate();
  }

  async function deleteLead(id: string) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? "Delete failed");
    await mutate();
  }

  async function changeStatus(lead: Lead, status: LeadStatus) {
    const optimistic = leads
      .map((l) => (l.id === lead.id ? { ...l, status } : l))
      .filter((l) => active.statuses.includes(l.status));

    await mutate({ leads: optimistic }, { revalidate: false });

    try {
      await updateLead(lead.id, { status });
    } catch (e) {
      await mutate(); // rollback
      throw e;
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 border-b border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)] py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={[
                "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                view === v.key
                  ? "bg-[color:var(--lavik-primary)] text-[color:var(--lavik-text-strong)]"
                  : "border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] text-[color:var(--lavik-text-strong)] hover:border-[color:var(--lavik-accent)]",
              ].join(" ")}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, phone, contact…"
            className="w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/60 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            className="shrink-0 rounded-xl bg-[color:var(--lavik-primary)] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:bg-[color:var(--lavik-accent-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--lavik-glow)]"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] shadow-sm">
        <div className="border-b border-[color:var(--lavik-border)]/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[color:var(--lavik-text-strong)]">
              {active.label}
            </p>
            <p className="text-xs text-[color:var(--lavik-text)]/70">
              {leads.length} leads
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-[color:var(--lavik-text)]/80">
            Loading…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">Failed to load leads.</div>
        ) : leads.length === 0 ? (
          <div className="p-4 text-sm text-[color:var(--lavik-text)]/80">
            No leads yet.
          </div>
        ) : (
          <div className="divide-y divide-[color:var(--lavik-border)]/60">
            {leads.map((lead) => (
              <div key={lead.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", lead })}
                      className="block min-w-0 text-left"
                    >
                      <p className="truncate text-base font-semibold text-[color:var(--lavik-text-strong)]">
                        {lead.companyName}
                      </p>
                    </button>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--lavik-text)]">
                      <a
                        href={toTelHref(lead.phoneNumber)}
                        className="font-medium underline decoration-[color:var(--lavik-accent)]/50 underline-offset-4 hover:decoration-[color:var(--lavik-accent)]"
                      >
                        {lead.phoneNumber}
                      </a>
                      {lead.contactPerson ? (
                        <span className="text-[color:var(--lavik-text)]/85">
                          {lead.contactPerson}
                        </span>
                      ) : null}
                      {lead.website ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-[color:var(--lavik-text)]/85 underline decoration-[color:var(--lavik-border)] underline-offset-4 hover:decoration-[color:var(--lavik-accent)]/60"
                        >
                          Website
                        </a>
                      ) : null}
                    </div>

                    {lead.notes ? (
                      <p className="mt-2 text-sm text-[color:var(--lavik-text)]/80">
                        {lead.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <select
                      value={lead.status}
                      onChange={async (e) => {
                        const status = e.target.value as LeadStatus;
                        try {
                          await changeStatus(lead, status);
                        } catch {
                          // rollback already handled
                        }
                      }}
                      className="w-full rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-bg)]/20 px-3 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] outline-none focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:w-48"
                      aria-label="Change status"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setDialog({ mode: "edit", lead })}
                      className="shrink-0 rounded-xl border border-[color:var(--lavik-border)] bg-[color:var(--lavik-surface)] px-3 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:border-[color:var(--lavik-accent)] sm:w-48"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialog ? (
        <LeadDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onCreate={async (draft) => {
            await createLead(draft);
            setDialog(null);
          }}
          onUpdate={async (id, patch) => {
            await updateLead(id, patch);
            setDialog(null);
          }}
          onDelete={async (id) => {
            await deleteLead(id);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

function LeadDialog(props: {
  dialog:
    | { mode: "create"; initial?: Partial<LeadDraft> }
    | { mode: "edit"; lead: Lead };
  onClose: () => void;
  onCreate: (draft: LeadDraft) => Promise<void>;
  onUpdate: (id: string, patch: Partial<LeadDraft>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { dialog, onClose } = props;
  const isEdit = dialog.mode === "edit";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const initial: LeadDraft = isEdit
    ? {
        companyName: dialog.lead.companyName,
        phoneNumber: dialog.lead.phoneNumber,
        website: dialog.lead.website ?? "",
        contactPerson: dialog.lead.contactPerson ?? "",
        notes: dialog.lead.notes ?? "",
        status: dialog.lead.status,
      }
    : {
        companyName: "",
        phoneNumber: "",
        website: "",
        contactPerson: "",
        notes: "",
        status: "NEW",
        ...(dialog.initial ?? {}),
      };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const draft: LeadDraft = {
      companyName: String(fd.get("companyName") ?? ""),
      phoneNumber: String(fd.get("phoneNumber") ?? ""),
      website: String(fd.get("website") ?? ""),
      contactPerson: String(fd.get("contactPerson") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      status: fd.get("status") as LeadStatus,
    };

    try {
      if (isEdit) {
        await props.onUpdate(dialog.lead.id, draft);
      } else {
        await props.onCreate(draft);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPending(false);
    }
  }

  function onRequestDelete() {
    if (!isEdit) return;
    setDeleteConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!isEdit) return;

    setError(null);
    setPending(true);
    try {
      await props.onDelete(dialog.lead.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPending(false);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[color:var(--lavik-border)] bg-[#0b0f0d] shadow-xl">
        <div className="flex items-center justify-between border-b border-[color:var(--lavik-border)] px-5 py-4">
          <p className="text-sm font-semibold text-[color:var(--lavik-text-strong)]">
            {isEdit ? "Edit lead" : "Add lead"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[color:var(--lavik-text)] hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">
                Company name
              </span>
              <input
                name="companyName"
                required
                defaultValue={initial.companyName}
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">
                Phone number
              </span>
              <input
                name="phoneNumber"
                required
                defaultValue={initial.phoneNumber}
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">Website</span>
              <input
                name="website"
                defaultValue={initial.website}
                placeholder="https://…"
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">
                Contact person
              </span>
              <input
                name="contactPerson"
                defaultValue={initial.contactPerson}
                className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">Notes</span>
            <textarea
              name="notes"
              defaultValue={initial.notes}
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none placeholder:text-[color:var(--lavik-text)]/50 focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[color:var(--lavik-text)]/80">Status</span>
            <select
              name="status"
              defaultValue={initial.status}
              className="mt-1 w-full rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-3 py-2 text-base text-[color:var(--lavik-text-strong)] outline-none focus:border-[color:var(--lavik-accent)] focus:shadow-[0_0_0_3px_var(--lavik-glow)] sm:text-sm"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {deleteConfirmOpen && isEdit ? (
            <div className="pt-3">
              <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
                <p className="text-sm font-semibold text-red-200">
                  Delete lead "{dialog.lead.companyName}"?
                </p>
                <p className="mt-1 text-xs text-[color:var(--lavik-text)]/80">
                  This cannot be undone.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:border-[color:var(--lavik-accent)] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onConfirmDelete}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {pending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 pt-2">
              {isEdit ? (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  disabled={pending}
                  className="mr-auto rounded-xl border border-red-500/40 bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-red-300 hover:border-red-400 hover:text-red-200 disabled:opacity-60"
                >
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[color:var(--lavik-border)] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:border-[color:var(--lavik-accent)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-[color:var(--lavik-primary)] px-4 py-2 text-sm font-medium text-[color:var(--lavik-text-strong)] hover:bg-[color:var(--lavik-accent-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--lavik-glow)] disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

