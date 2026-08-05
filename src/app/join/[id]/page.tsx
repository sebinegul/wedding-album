import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlbum } from "@/lib/store";
import { Header } from "@/components/Header";
import { JoinForm } from "@/components/JoinForm";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const album = getAlbum(id);
  if (!album) return { title: "Album not found" };
  return {
    title: `Join ${album.title}`,
    description: `You are invited to ${album.title}, the album of ${album.couple}.`,
  };
}

export default async function JoinPage({ params }: Props) {
  const { id } = await params;
  const album = getAlbum(id);
  if (!album) notFound();

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100dvh-4rem)] items-center px-4 py-16">
        <JoinForm albumId={album.id} albumTitle={album.title} couple={album.couple} />
      </main>
    </>
  );
}
