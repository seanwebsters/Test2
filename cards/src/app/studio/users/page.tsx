import Link from "next/link";
import { getStore } from "@/lib/db";

export const metadata = { title: "Users" };

export default async function StudioUsers() {
  const state = getStore().read();
  const users = Object.values(state.users).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-bone-3">{users.length} accounts ({users.filter((u) => u.isGuest).length} guests, {users.filter((u) => u.isDemo).length} seeded demo collectors).</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="p-2.5">User</th><th>Type</th><th className="text-right">Cards</th><th className="text-right">Packs</th><th className="text-right">Shards</th><th>Joined</th><th className="p-2.5">Last seen</th></tr></thead>
          <tbody>
            {users.slice(0, 300).map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="p-2.5">{u.isGuest ? <span className="text-bone-3">{u.displayName}</span> : <Link href={`/profile/${u.username}`} className="font-semibold hover:underline">{u.displayName}</Link>}<span className="ml-1 text-[11px] text-bone-4">@{u.username}</span></td>
                <td className="text-bone-3">{u.role === "admin" ? "Admin" : u.isDemo ? "Demo" : u.isGuest ? "Guest" : "Account"}</td>
                <td className="text-right tabular-nums">{Object.keys(state.inventory[u.id] ?? {}).length}</td>
                <td className="text-right tabular-nums">{state.openings.filter((o) => o.userId === u.id).length}</td>
                <td className="text-right tabular-nums">{state.wallets[u.id]?.shards ?? 0}</td>
                <td className="text-bone-3">{u.createdAt.slice(0, 10)}</td>
                <td className="p-2.5 text-bone-3">{u.lastSeenAt.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
