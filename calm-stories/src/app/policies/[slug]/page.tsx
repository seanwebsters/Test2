import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { POLICIES } from "@/lib/policies";
import { ReportButton } from "@/components/ReportButton";
import { getViewer } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICIES[slug]?.title ?? "Policy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();
  const viewer = await getViewer();
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12 sm:px-6">
      <h1 className="font-serif text-5xl font-semibold">{policy.title}</h1>
      <p className="mt-3 text-mist">{policy.intro}</p>
      {policy.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="font-serif text-2xl font-semibold">{s.heading}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-white/80">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
      {slug === "report" && (
        <div className="mt-10">
          <ReportButton targetType="series" targetId="general" signedIn={!!viewer.user} />
        </div>
      )}
    </article>
  );
}
