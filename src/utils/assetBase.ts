/**
 * Webpack runtime asset origin.
 *
 * The release script rewrites the initial <script>/<link> tags and injects
 * `window.__ASSET_BASE__`. This module applies that origin to webpack's
 * runtime public path so async chunks, chunk CSS and imported media are
 * requested directly from the CDN instead of hitting the origin's redirect.
 *
 * Without a CDN the same-origin default is kept. The fallback derives the
 * origin from the main script URL when `__ASSET_BASE__` is absent, which keeps
 * hand-copied builds working.
 *
 * Must be imported before any module that can trigger a dynamic import.
 */

declare let __webpack_public_path__: string;

type AssetBaseWindow = Window & { __ASSET_BASE__?: unknown };

function normalizeBase(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch {
    return '';
  }
}

function detectAssetBase(): string {
  const injected = (window as AssetBaseWindow).__ASSET_BASE__;
  if (typeof injected === 'string' && injected.trim()) {
    return normalizeBase(injected.trim());
  }

  // main.<hash>.js lives at <origin>/starstatic/js/main.<hash>.js
  const script = document.currentScript;
  if (script instanceof HTMLScriptElement && script.src) {
    const marker = '/starstatic/';
    const markerIndex = script.src.indexOf(marker);
    if (markerIndex > 0) {
      return normalizeBase(script.src.slice(0, markerIndex + 1));
    }
  }
  return '';
}

const assetBase = detectAssetBase();
if (assetBase && assetBase !== `${window.location.origin}/`) {
  // Webpack replaces this free variable assignment with a runtime public-path update.
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  __webpack_public_path__ = assetBase;
}

export {};
