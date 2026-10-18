"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Award, Briefcase, Eye, EyeOff, FolderOpen, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useCelebrate } from "@/components/app/Celebrate";
import { Sheet } from "@/components/ui/primitives";
import { api } from "@/lib/client";
import type { PassportItem } from "@/lib/engine/model";

const KINDS = {
  experience: { label: "Experience", icon: Briefcase },
  education: { label: "Education", icon: GraduationCap },
  certification: { label: "Certification", icon: Award },
  project: { label: "Project", icon: FolderOpen },
} as const;

type Draft = Omit<PassportItem, "id" | "createdAt"> & { id?: string };
const blank = (): Draft => ({ kind: "experience", title: "", organisation: "", startDate: null, endDate: null, description: "", url: null, isPublic: true });

export function PassportItems({ items }: { items: PassportItem[] }) {
  const router = useRouter();
  const { toast } = useCelebrate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await api("/api/passport", { body: { ...draft, url: draft.url || null } });
      setDraft(null);
      toast("Passport updated");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await api(`/api/passport/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="space-y-2">
        {items.map((i) => {
          const K = KINDS[i.kind];
          return (
            <div key={i.id} className="card flex items-start gap-3 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2">
                <K.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold">{i.title}</div>
                <div className="text-sm text-ink-2">
                  {i.organisation}
                  {i.startDate && ` · ${i.startDate.slice(0, 7)} – ${i.endDate ? i.endDate.slice(0, 7) : "now"}`}
                </div>
                {i.description && <p className="mt-1 text-sm text-ink-3">{i.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1 text-ink-3">
                <span title={i.isPublic ? "Visible on public passport" : "Private"}>{i.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}</span>
                <button className="rounded-full p-1.5 hover:bg-surface-2" onClick={() => setDraft({ ...i })} aria-label={`Edit ${i.title}`}>
                  <Pencil size={16} />
                </button>
                <button className="rounded-full p-1.5 hover:bg-surface-2" onClick={() => remove(i.id)} aria-label={`Delete ${i.title}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn-ghost btn-sm mt-3 w-full" onClick={() => setDraft(blank())}>
        <Plus size={16} /> Add experience, education or certification
      </button>
      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit entry" : "Add to your Passport"}>
        {draft && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => (
                <button type="button" key={k} onClick={() => setDraft({ ...draft, kind: k })} className={`chip justify-center ${draft.kind === k ? "!border-teal !bg-teal-soft !text-teal-deep" : ""}`} aria-pressed={draft.kind === k}>
                  {KINDS[k].label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="eyebrow">Title</span>
              <input className="input mt-1" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} placeholder="e.g. Weekend barista" />
            </label>
            <label className="block">
              <span className="eyebrow">Organisation</span>
              <input className="input mt-1" value={draft.organisation} onChange={(e) => setDraft({ ...draft, organisation: e.target.value })} maxLength={120} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="eyebrow">Start</span>
                <input className="input mt-1" type="date" value={draft.startDate ?? ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value || null })} />
              </label>
              <label className="block">
                <span className="eyebrow">End</span>
                <input className="input mt-1" type="date" value={draft.endDate ?? ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value || null })} />
              </label>
            </div>
            <label className="block">
              <span className="eyebrow">What did you do?</span>
              <textarea className="input mt-1 min-h-[80px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={1500} />
            </label>
            <label className="block">
              <span className="eyebrow">Link (optional)</span>
              <input className="input mt-1" value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--teal))]" />
              Show on my public passport
            </label>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
