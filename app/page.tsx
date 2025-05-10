import { HeroSection } from "@/components/HeroSection"
import { FeaturesSection } from "@/components/FeaturesSection"
import { Footer } from "@/components/Footer"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <HeroSection />
        <FeaturesSection />
      </div>
      <Footer />
    </main>
  )
}
