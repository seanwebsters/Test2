import { notFound } from "next/navigation";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import { CategoryView } from "./CategoryView";
import type { CategoryId } from "@/lib/types";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const c = CATEGORY_BY_ID[(await params).category as CategoryId];
  return c ? { title: c.label } : {};
}

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const id = (await params).category as CategoryId;
  if (!CATEGORY_BY_ID[id]) notFound();
  return <CategoryView id={id} />;
}
