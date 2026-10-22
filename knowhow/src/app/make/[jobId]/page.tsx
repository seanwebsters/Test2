import { JobView } from "./JobView";
export const metadata = { title: "Building your series" };
export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  return <JobView id={(await params).jobId} />;
}
