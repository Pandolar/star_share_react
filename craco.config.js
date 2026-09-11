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
        // 异步 chunk 用 [id] 而非 [name]：cacheGroup 的 name（如 admin-pages）只影响
        // webpack 生成的运行时映射表，第 4e3 号 chunk 因 name/id 不一致被写成
        // 4000.<hash>.chunk.js，运行时却按 4e3.<hash>.chunk.js 请求，线上必然 404。
        // 用 [id] 让「发射的文件名」与「运行时请求的文件名」同源，杜绝该类错位。
        chunkFilename: isProd
          ? 'starstatic/js/[id].[contenthash:8].chunk.js'
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
