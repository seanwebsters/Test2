"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, MoreHorizontal, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useStudio } from "@/lib/client-store";
import type { Game } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GameActions({ game, onChange, align = "right" }: { game: Pick<Game, "id" | "name" | "currentVersion" | "status">; onChange?: () => void; align?: "left" | "right" }) {
  const router = useRouter();
  const toast = useStudio((s) => s.toast);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(game.name);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const playable = game.currentVersion > 0;
  const items = [
    { label: "Rename", icon: PenLine, run: () => (setName(game.name), setDialog("rename")) },
    { label: "Duplicate", icon: Copy, run: duplicate },
    ...(playable ? [{ label: "Export HTML5 bundle", icon: Download, run: () => (window.location.href = `/api/games/${game.id}/export`) }] : []),
    { label: "Delete", icon: Trash2, run: () => setDialog("delete"), danger: true },
  ];

  async function duplicate() {
    const { game: copy } = await api<{ game: Game }>(`/api/games/${game.id}/duplicate`, { method: "POST" });
    toast({ title: "Duplicated", body: `${copy.name} is in your library with every version.` });
    onChange?.();
  }
  async function rename() {
    await api(`/api/games/${game.id}`, { method: "PATCH", json: { name } });
    setDialog(null);
    toast({ title: "Renamed" });
    onChange?.();
  }
  async function remove() {
    await api(`/api/games/${game.id}`, { method: "DELETE" });
    setDialog(null);
    toast({ title: "Deleted", body: `${game.name} and its versions were removed.` });
    if (onChange) onChange();
    else router.push("/games");
  }

  return (
    <div ref={ref} className="relative">
      <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${game.name}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <MoreHorizontal />
      </Button>
      {open && (
        <div role="menu" className={cn("absolute top-9 z-30 w-56 overflow-hidden rounded-2xl border border-line bg-paper p-1.5 shadow-lift", align === "right" ? "right-0" : "left-0")}>
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void Promise.resolve(it.run()).catch((e) => toast({ title: "Something went wrong", body: (e as Error).message, tone: "error" }));
              }}
              className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition hover:bg-ivory-deep", "danger" in it && it.danger ? "text-rose" : "text-ink")}
            >
              <it.icon className="size-4" strokeWidth={1.6} /> {it.label}
            </button>
          ))}
        </div>
      )}
      <Dialog open={dialog === "rename"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogTitle>Rename game</DialogTitle>
          <form className="mt-5 space-y-4" onSubmit={(e) => (e.preventDefault(), void rename())}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Game name" maxLength={80} />
            <Button type="submit" disabled={!name.trim()}>Save name</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogTitle>Delete {game.name}?</DialogTitle>
          <DialogDescription>This removes the game and every version. Exported bundles you&apos;ve downloaded are not affected.</DialogDescription>
          <div className="mt-6 flex gap-2">
            <Button variant="danger" onClick={() => void remove()}>Delete permanently</Button>
            <Button variant="ghost" onClick={() => setDialog(null)}>Keep it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
