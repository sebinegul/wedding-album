import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { UploadPage } from "@/components/UploadPage";

export const metadata: Metadata = {
  title: "Upload photos",
  description: "Upload your photos and videos to a wedding album.",
};

type Props = { searchParams: Promise<{ album?: string }> };

export default async function UploadRoute({ searchParams }: Props) {
  const { album } = await searchParams;
  return (
    <>
      <Header />
      <main className="min-h-[calc(100dvh-4rem)]">
        <UploadPage initialAlbumId={album} />
      </main>
    </>
  );
}
