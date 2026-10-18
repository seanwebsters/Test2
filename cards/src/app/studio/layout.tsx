import { StudioGate } from "@/components/studio/StudioGate";
import { StudioNav } from "@/components/studio/StudioNav";
import { aiProvider } from "@/lib/studio/providers";
import { loadViewer } from "@/lib/view/viewer";

export const metadata = { title: { default: "Studio", template: "%s · NEXARA Studio" } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user } = await loadViewer();
  if (user.role !== "admin") {
    const dev = process.env.NODE_ENV !== "production" && !process.env.STUDIO_ADMIN_PASSWORD;
    return <StudioGate hint={dev ? 'Development build: the seeded admin is "studio" / "nexara-studio". Set STUDIO_ADMIN_PASSWORD to change it.' : undefined} />;
  }
  const ai = aiProvider();
  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 pt-6 md:px-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-3 hidden px-3 font-brand text-[12px] font-semibold tracking-[0.3em] text-ember-2 lg:block">STUDIO</p>
        <StudioNav />
        <div className={`mt-6 hidden rounded-xl border p-3 text-[12px] lg:block ${ai ? "border-uncommon/30 text-uncommon" : "border-amber-400/30 text-amber-200"}`}>
          {ai ? `AI agents: ${ai.label} (${ai.model})` : "AI agents: offline template mode. Set ANTHROPIC_API_KEY to enable model-written drafts."}
        </div>
      </aside>
      <div className="min-w-0 pb-10">{children}</div>
    </div>
  );
}
