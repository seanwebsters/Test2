import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SERIES, getSeries } from "@/lib/catalog";
import { SeriesView } from "./SeriesView";

export function generateStaticParams() {
  return SERIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getSeries((await params).slug);
  return s ? { title: s.title, description: s.tagline } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const s = getSeries((await params).slug);
  if (!s) notFound();
  return <SeriesView series={s} />;
}
