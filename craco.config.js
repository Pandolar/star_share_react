/**
 * CRACO configuration to change CRA's default output directories
 * from build/static/* to build/starstatic/* for JS, CSS, and media assets.
 */

const path = require('path');

module.exports = {
  webpack: {
    configure: (config, { env }) => {
      const isProd = env === 'production';

      // JS output filenames
      config.output = {
        ...config.output,
        filename: isProd
          ? 'starstatic/js/[name].[contenthash:8].js'
          : 'starstatic/js/bundle.js',
        chunkFilename: isProd
          ? 'starstatic/js/[name].[contenthash:8].chunk.js'
          : 'starstatic/js/[name].chunk.js',
        // Asset modules (images, fonts, etc.)
        assetModuleFilename: 'starstatic/media/[name].[hash:8][ext]'
      };

      // Update MiniCssExtractPlugin output paths
      const miniCssExtractPlugin = config.plugins.find(
        (p) => p && p.constructor && p.constructor.name === 'MiniCssExtractPlugin'
      );

      if (miniCssExtractPlugin && miniCssExtractPlugin.options) {
        miniCssExtractPlugin.options.filename = 'starstatic/css/[name].[contenthash:8].css';
        miniCssExtractPlugin.options.chunkFilename = 'starstatic/css/[name].[contenthash:8].chunk.css';
      }

      return config;
    }
  }
};

