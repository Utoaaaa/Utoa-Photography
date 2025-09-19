import { YearGrid } from '@/components/ui/YearGrid';
import { getPublishedYears } from '@/lib/queries/years';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default async function Homepage() {
  const years = await getPublishedYears();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <AnimatedSection>
        <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Geometric Pattern - Camera-inspired design */}
            <div 
              className="relative w-96 h-96 opacity-10"
              data-testid="hero-geometric"
              aria-hidden="true"
            >
              {/* Outer circle - camera body */}
              <div className="absolute inset-0 border-2 border-gray-900 rounded-full"></div>
              
              {/* Inner circle - lens */}
              <div className="absolute inset-16 border-2 border-gray-900 rounded-full"></div>
              
              {/* Central aperture */}
              <div className="absolute inset-32 border border-gray-900 rounded-full"></div>
              
              {/* Aperture blades */}
              <div className="absolute inset-28 flex items-center justify-center">
                <div className="w-8 h-8 border border-gray-900 rotate-45 transform"></div>
                <div className="absolute w-8 h-8 border border-gray-900 -rotate-45 transform"></div>
              </div>
              
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-gray-900"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-gray-900"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-gray-900"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-gray-900"></div>
            </div>
          </div>
          
          <div className="relative z-10 text-center space-y-8">
            <h1 className="text-6xl md:text-8xl font-light tracking-widest text-gray-900">
              UTOA
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-light tracking-wide">
              PHOTOGRAPHY
            </p>
          </div>
        </section>
      </AnimatedSection>

      {/* Years Timeline */}
      <AnimatedSection delay={0.3}>
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-light tracking-wide text-gray-900 mb-4">
              Timeline
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore photography collections organized by year, capturing moments and stories through time.
            </p>
          </div>
          
          <YearGrid years={years} />
        </section>
      </AnimatedSection>
    </div>
  );
}
