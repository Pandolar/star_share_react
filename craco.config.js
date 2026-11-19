/**
 * CRACO configuration to change CRA's default output directories
 * from build/static/* to build/starstatic/* for JS, CSS, and media assets.
 */

const path = require('path');
const fs = require('fs');

// CRACO 在 react-scripts 加载 .env* 之前解析本文件，因此这里显式读取
// .env.production。环境变量优先级更高，便于临时覆盖。
function readDotenv(file) {
  try {
    const values = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[match[1]] = value;
    }
    return values;
  } catch {
    return {};
  }
}

// 生产构建的静态资源域名。来自 .env.production 或同名环境变量。
// 留空则保持同源 /starstatic/。只接受裸 origin，路径由 webpack 拼成
// `${ASSET_CDN_URL}/starstatic/...`。
const fileEnv = readDotenv(path.join(__dirname, '.env.production'));
const assetCdn = (process.env.ASSET_CDN_URL || fileEnv.ASSET_CDN_URL || '')
  .trim()
  .replace(/\/+$/, '');
if (assetCdn && !/^https?:\/\/[^/]+$/.test(assetCdn)) {
  throw new Error('ASSET_CDN_URL 必须是 http(s)://host[:port] 的裸 origin');
}
const assetPublicPath = assetCdn ? `${assetCdn}/` : '';

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
        assetModuleFilename: 'starstatic/media/[name].[hash:8][ext]',
        // 生产构建把入口、异步 chunk 和资源模块的 URL 指到 CDN；
        // %PUBLIC_URL% 仍由 CRA 保持为本站根，sw.js/offline.html 继续同源。
        publicPath: isProd && assetPublicPath ? assetPublicPath : config.output.publicPath,
      };

      // Update MiniCssExtractPlugin output paths
      const miniCssExtractPlugin = config.plugins.find(
        (p) => p && p.constructor && p.constructor.name === 'MiniCssExtractPlugin'
      );

      if (miniCssExtractPlugin && miniCssExtractPlugin.options) {
        miniCssExtractPlugin.options.filename = 'starstatic/css/[name].[contenthash:8].css';
        miniCssExtractPlugin.options.chunkFilename = 'starstatic/css/[name].[contenthash:8].chunk.css';
      }

      if (isProd && assetPublicPath) {
        // CRA 在构造插件时显式传了 paths.publicUrlOrPath，必须同步覆盖，
        // 否则 asset-manifest.json 会继续写成本站相对路径。
        const manifestPlugin = config.plugins.find(
          (p) => p && p.constructor && p.constructor.name === 'WebpackManifestPlugin'
        );
        if (manifestPlugin && manifestPlugin.options) {
          manifestPlugin.options.publicPath = assetPublicPath;
        }
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
