import { getAgentSettings, providerStatus } from "@/lib/agents";
import { getViewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/policy";
import { isStaff } from "../staff";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Agent settings" };

export default async function SettingsPage() {
  if (!(await isStaff())) return null;
  const [settings, viewer] = await Promise.all([getAgentSettings(), getViewer()]);
  const providers = providerStatus();
  return (
    <div className="max-w-3xl">
      <h2 className="headline text-3xl">Agent settings</h2>
      <p className="text-sm text-mist">
        API keys are set as server environment variables (<code>ANTHROPIC_API_KEY</code>, <code>ELEVENLABS_API_KEY</code>, <code>GEMINI_API_KEY</code>) and are never shown here.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-xs">
        {Object.values(providers).map((p) => (
          <li key={p.name} className={p.connected ? "chip bg-emerald-300/10 text-emerald-200" : "chip bg-amber-200/10 text-amber-200"}>{p.name}: {p.connected ? "connected" : "not connected"}</li>
        ))}
      </ul>
      <SettingsForm initial={settings} canEdit={isAdmin(viewer)} />
    </div>
  );
}
