import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CreateAlbumWizard } from "@/components/CreateAlbumWizard";
import { QuickJoin } from "@/components/QuickJoin";
import { YourAlbums } from "@/components/YourAlbums";
import { CTASection, HowItWorksSection } from "@/components/HomeSections";

export default function HomePage() {
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
              <YourAlbums />
            </div>
          </div>
        </section>

        <HowItWorksSection />
        <CTASection />
      </main>
    </>
  );
}
