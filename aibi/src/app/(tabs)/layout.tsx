import { TabBar } from "@/components/AppChrome";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1 pb-[calc(84px+var(--safe-bottom))]">{children}</main>
      <TabBar />
    </>
  );
}
