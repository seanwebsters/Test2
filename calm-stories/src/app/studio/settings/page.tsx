import { getViewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/policy";
import { AGENTS } from "@/lib/studio/agents";
import { getAgentProfile } from "@/lib/studio/llm";
import { providerStatus } from "@/lib/studio/providers";
import { getGuidelines, getStudioSettings } from "@/lib/studio/settings";
import { cx } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";
import { AgentEditor } from "./AgentEditor";
import { GuidelinesEditor } from "./GuidelinesEditor";
import { StudioSettingsForm } from "./StudioSettingsForm";
import { AdminAction } from "@/components/admin/AdminAction";
import { diskUsage } from "@/lib/services/disk";

const gb = (b: number) => `${(b / 1e9).toFixed(b < 1e10 ? 2 : 1)} GB`;

export const metadata = { title: "Settings" };

export default async function StudioSettingsPage() {
  if (!(await isStaff())) return null;
  const [viewer, settings, guidelines] = await Promise.all([getViewer(), getStudioSettings(), getGuidelines()]);
  const admin = isAdmin(viewer);
  const profiles = await Promise.all(AGENTS.filter((a) => !a.human).map(async (a) => ({ def: a, profile: await getAgentProfile(a.key) })));
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-5xl text-white">Settings</h1>
        <a href="/studio/office-editor" className="ml-auto rounded-xl border border-lavender/40 px-4 py-2 font-serif text-white hover:bg-lavender/10">Edit the 3D office →</a>
      </div>
      {(() => {
        const d = diskUsage({ breakdown: true });
        if (!d) return null;
        const pct = Math.round((d.usedBytes / Math.max(1, d.totalBytes)) * 100);
        return (
          <section className="rounded-2xl border border-white/10 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-2xl text-white">Storage</h2>
                <p className="text-sm text-mist">
                  Volume: <span className="text-white">{gb(d.usedBytes)} used of {gb(d.totalBytes)}</span> ({gb(d.freeBytes)} free).{" "}
                  {Object.entries(d.byFolder).map(([k, v]) => `${k} ${gb(v)}`).join(" · ")}
                </p>
                <div className="mt-2 h-2 max-w-md rounded-full bg-white/10"><div className={cx("h-full rounded-full", pct > 90 ? "bg-rose-400" : "bg-lavender")} style={{ width: `${pct}%` }} /></div>
              </div>
              <AdminAction endpoint="/api/studio/storage" label="Free up space" pendingLabel="Tidying…" className="btn-ghost btn-sm" />
            </div>
          </section>
        );
      })()}
      <section>
        <h2 className="font-serif text-3xl text-white">Provider connections</h2>
        <p className="text-sm text-mist">Keys live only in server environment variables and are never shown or stored in the database.</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {providerStatus().map((p) => (
            <li key={p.key} className={cx("rounded-2xl border p-4", p.connected ? "border-emerald-300/30" : "border-amber-300/30")}>
              <div className="flex justify-between"><span className="text-white">{p.name}</span><span className={p.connected ? "text-emerald-200" : "text-amber-200"}>{p.connected ? "Connected" : "Not connected"}</span></div>
              <div className="text-xs text-mist">{p.role}</div>
              {!p.connected && <code className="mt-1 block text-xs text-amber-100">{p.key === "FFMPEG" ? "install ffmpeg or set FFMPEG_PATH" : `${p.key}=…`}</code>}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-serif text-3xl text-white">Models, budgets and permissions</h2>
        <StudioSettingsForm initial={settings} canEdit={admin} />
      </section>
      <section>
        <h2 className="font-serif text-3xl text-white">Agent instructions</h2>
        <p className="text-sm text-mist">Each agent&rsquo;s standing instructions, model and effort. Changes apply from the agent&rsquo;s next task.</p>
        <ul className="mt-4 space-y-3">{profiles.map(({ def, profile }) => <AgentEditor key={def.key} name={def.name} title={def.title} agentKey={def.key} initial={profile} canEdit={admin} />)}</ul>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-serif text-3xl text-white">House writing guidelines</h2>
        <p className="text-sm text-mist">Every writing and editorial agent reads these, together with the reference benchmarks, before each task.</p>
        <GuidelinesEditor id="global" initial={guidelines.global} />
      </section>
    </div>
  );
}
