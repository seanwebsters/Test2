import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import { getViewer } from "@/lib/server/auth";

export default async function Root() {
  if (await getViewer()) redirect("/home");
  return <Landing />;
}
