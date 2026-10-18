import { WalletView } from "./WalletView";
import { stripeConfigured } from "@/lib/billing";
export const metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";
export default function Page() {
  return <WalletView stripe={stripeConfigured()} />;
}
