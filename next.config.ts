import type { NextConfig } from "next";

const config: NextConfig = {
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default config;
