import { redirect } from "next/navigation";

/** The studio dashboard replaced the old admin overview. */
export default function AdminOverview() {
  redirect("/studio");
}
