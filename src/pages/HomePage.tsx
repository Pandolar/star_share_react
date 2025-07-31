import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LatestModels from '../components/LatestModels';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { homeSEOConfig } from '../config/seo';

const HomePage: React.FC = () => {
  return (
    <>
      {/* SEO头部信息 */}
      <SEOHead config={homeSEOConfig} />

      <div className="HomePage">
        <Header />
        <main>
          <Hero />
          <LatestModels />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default HomePage;