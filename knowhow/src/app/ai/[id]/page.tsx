import { AiSeriesView } from "./AiSeriesView";
export const metadata = { title: "Your AI series" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AiSeriesView id={(await params).id} />;
}
