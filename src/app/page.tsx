import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CreateAlbumWizard } from "@/components/CreateAlbumWizard";
import { QuickJoin } from "@/components/QuickJoin";
import {
  CTASection,
  HowItWorksSection,
  RecentAlbumsSection,
} from "@/components/HomeSections";
import { listAlbums } from "@/lib/store";

// The recent-albums rail reads the local datastore on every request, so the
// home page must not be statically prerendered with a stale snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const albums = await listAlbums(6);

  return (
    <>
      <Header />
      <main>
        <HeroSection />

        {/* Create + join */}
        <section
          id="create"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6"
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <CreateAlbumWizard />
            <div className="space-y-8">
              <QuickJoin />
              <RecentAlbumsSection albums={albums} />
            </div>
          </div>
        </section>

        <HowItWorksSection />
        <CTASection />
      </main>
    </>
  );
}
