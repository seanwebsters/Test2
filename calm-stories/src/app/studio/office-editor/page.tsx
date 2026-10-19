import { getTeamState } from "@/lib/studio/team";
import { TeamRoom } from "@/components/studio/TeamRoom";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Office editor" };

/** Sean-only: re-render the 3D office, remake or animate the 3D team. The AI Team page itself has no editing. */
export default async function OfficeEditorPage() {
  if (!(await isStaff())) return null;
  const team = await getTeamState();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-4xl text-white">Office editor</h1>
        <p className="text-sm text-mist">Only you can open this page. Changes here show on the AI Team page once you press Save.</p>
      </header>
      <TeamRoom initial={team} canEdit />
    </div>
  );
}
