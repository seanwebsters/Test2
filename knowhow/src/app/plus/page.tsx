import { PlusView } from "./PlusView";
import { stripeConfigured } from "@/lib/billing";
export const metadata = { title: "KNOWHOW+" };
export const dynamic = "force-dynamic";
export default function Page() {
  return <PlusView stripe={stripeConfigured()} />;
}
