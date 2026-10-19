import { redirect } from "next/navigation";

/** The AI Team now lives on the shared studio home. */
export default function TeamPage() {
  redirect("/office");
}
