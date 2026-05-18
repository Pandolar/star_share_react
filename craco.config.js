/**
 * CRACO configuration to change CRA's default output directories
 * from build/static/* to build/starstatic/* for JS, CSS, and media assets.
 */

const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (config, { env }) => {
      const isProd = env === 'production';
      const terserPlugin = config.optimization?.minimizer?.find(
        (plugin) => plugin && plugin.constructor && plugin.constructor.name === 'TerserPlugin'
      );

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

      if (isProd) {
        // 关闭 source map 输出，减少构建产物体积。
        config.devtool = false;

        config.optimization = {
          ...config.optimization,
          chunkIds: 'deterministic',
          splitChunks: {
            ...config.optimization.splitChunks,
            chunks: 'all',
            cacheGroups: {
              ...(config.optimization.splitChunks?.cacheGroups || {}),
              heroui: {
                test: /[\\/]node_modules[\\/]@heroui[\\/]/,
                name: 'heroui',
                priority: 30,
                chunks: 'all',
                reuseExistingChunk: true
              },
              adminPages: {
                test: /[\\/]src[\\/]pages[\\/]admin[\\/]/,
                name: 'admin-pages',
                priority: 20,
                chunks: 'async',
                minChunks: 1,
                reuseExistingChunk: true
              }
            }
          }
        };

        if (terserPlugin) {
          terserPlugin.options = {
            ...terserPlugin.options,
            extractComments: false,
            terserOptions: {
              ...(terserPlugin.options?.terserOptions || {}),
              compress: {
                ...(terserPlugin.options?.terserOptions?.compress || {}),
                passes: 2,
                drop_console: true,
                drop_debugger: true
              },
              format: {
                ...(terserPlugin.options?.terserOptions?.format || {}),
                comments: false
              }
            }
          };
        }
      }

      return config;
    }
  }
};
