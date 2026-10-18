import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { findCollection } from "@/lib/collections";
import { CollectionView } from "./CollectionView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const c = await findCollection((await params).id);
  if (!c) notFound();
  const user = await currentUser().catch(() => null);
  if (!c.isPublic && c.ownerId !== user?.id) notFound();
  return <CollectionView initial={c} isOwner={c.ownerId === user?.id} />;
}
