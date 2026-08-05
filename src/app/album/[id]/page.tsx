import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlbumDetail } from "@/lib/store";
import { AlbumView } from "@/components/AlbumView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAlbumDetail(id);
  if (!detail) return { title: "Album not found" };
  return {
    title: detail.album.title,
    description: `${detail.album.couple} · ${detail.album.title}. Every guest photo in one place.`,
  };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const detail = await getAlbumDetail(id);
  if (!detail) notFound();

  return (
    <AlbumView
      album={detail.album}
      initialMedia={detail.media}
      initialGuests={detail.guests}
    />
  );
}
