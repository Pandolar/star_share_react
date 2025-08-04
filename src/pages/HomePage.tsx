import React, { Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LatestModels from '../components/LatestModels';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { homeSEOConfig } from '../config/seo';

// 骨架屏组件
const HomePageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-gray-100"></div>
      {/* Hero skeleton */}
      <div className="h-96 bg-gray-200"></div>
      {/* LatestModels skeleton */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <>
      <SEOHead config={homeSEOConfig} />
      <Suspense fallback={<HomePageSkeleton />}>
        <div className="HomePage">
          <Header />
          <main>
            <Hero />
            <LatestModels />
          </main>
          <Footer />
        </div>
      </Suspense>
    </>
  );
};

export default HomePage;