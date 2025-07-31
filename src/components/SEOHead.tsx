import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEOConfig } from '../types/seo';

interface SEOHeadProps {
  config: SEOConfig;
}

const SEOHead: React.FC<SEOHeadProps> = ({ config }) => {
  return (
    <Helmet>
      {/* 基础SEO标签 */}
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      {config.keywords && (
        <meta name="keywords" content={config.keywords} />
      )}
      
      {/* 技术SEO */}
      {config.robots && (
        <meta name="robots" content={config.robots} />
      )}
      {config.canonical && (
        <link rel="canonical" href={config.canonical} />
      )}

      {/* Open Graph基础标签 */}
      <meta property="og:title" content={config.ogTitle || config.title} />
      <meta property="og:description" content={config.ogDescription || config.description} />
      <meta property="og:type" content="website" />
      {config.ogImage && (
        <meta property="og:image" content={config.ogImage} />
      )}
    </Helmet>
  );
};

export default SEOHead; 