import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LatestModels from '../components/LatestModels';
import Footer from '../components/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="HomePage">
      <Header />
      <main>
        <Hero />
        <LatestModels />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;