/**
 * 部署后旧 `index.html` 仍引用已下线的 chunk 时，静态层会把 SPA 的 index.html 以
 * `200 text/html` 返回（而不是 404），浏览器按 ORB / MIME 校验拒绝执行，最终抛出
 * `ChunkLoadError`。此时单纯的 `location.reload()` 会继续命中同一份过期文档，
 * 于是「页面加载中 → 页面正在恢复中 → /sharespeedtest → 优选节点」会无限循环。
 *
 * 这里集中处理这类「资源版本不一致」故障：
 *   1. 判定错误是否属于资源版本不一致（业务异常不参与自愈）；
 *   2. 清理 Service Worker 与 Cache Storage，避免旧壳被永久固化；
 *   3. 用带一次性时间戳的 URL 重新加载文档，绕过浏览器与 CDN 的缓存键；
 *   4. 记录已自愈次数（带 5 分钟有效期），额度用尽后不再自动重载，
 *      交由 ErrorBoundary 展示可操作的终态页面，杜绝无限循环。
 */

const RECOVERY_PARAM = '_r';
const ATTEMPT_KEY = 'asset-recovery-attempt';
/** 额度有效期：超过该时长视为“环境已变化”，允许重新尝试自愈。 */
const ATTEMPT_TTL_MS = 5 * 60 * 1000;
/** 单次会话内最多自动重载次数：一次来自 lazyWithRetry，一次来自 ErrorBoundary。 */
export const MAX_AUTO_RECOVERIES = 2;

const STALE_ASSET_PATTERNS: RegExp[] = [
  /ChunkLoadError/i,
  /Loading chunk \S+ failed/i,
  /Loading CSS chunk/i,
  /not a valid JavaScript MIME type/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload (CSS|module)/i,
];

/** 取出错误的 name/message 文本，兼容 Error、字符串与跨域对象。 */
function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return '';

  const parts: string[] = [];
  if ('name' in error && typeof error.name === 'string') parts.push(error.name);
  if ('message' in error && typeof error.message === 'string') parts.push(error.message);
  return parts.join(' ');
}

/** 是否为「部署后资源版本不一致」类错误（而非业务异常）。 */
export function isStaleAssetError(error: unknown): boolean {
  const text = describeError(error).trim();
  if (!text) return false;
  return STALE_ASSET_PATTERNS.some((pattern) => pattern.test(text));
}

/** 把 unknown 收窄为可索引对象；仅用于读取已由 JSON.parse 解析出的字段。 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function numberField(value: unknown, key: 'count' | 'at'): number {
  const record = asRecord(value);
  const raw: unknown = record ? record[key] : undefined;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function readAttempt(): { count: number; at: number } {
  try {
    const raw = window.sessionStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { count: 0, at: Date.now() };
    const parsed: unknown = JSON.parse(raw);
    const count = numberField(parsed, 'count');
    const at = numberField(parsed, 'at');
    if (!count || !at || Date.now() - at > ATTEMPT_TTL_MS) return { count: 0, at: Date.now() };
    return { count, at };
  } catch {
    return { count: 0, at: Date.now() };
  }
}

function writeAttempt(count: number): void {
  try {
    window.sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ count, at: Date.now() }));
  } catch {
    /* 隐私模式下 sessionStorage 不可用：自愈退化为单次尝试 */
  }
}

/** 已用掉多少次自动自愈额度（超过 MAX_AUTO_RECOVERIES 即不再自动重载）。 */
export function recoveryAttemptsUsed(): number {
  return readAttempt().count;
}

/** 手动操作前清空额度，让用户明确的“刷新”意愿不被历史计数拦住。 */
export function clearRecoveryAttempts(): void {
  try {
    window.sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    /* ignore */
  }
}

/** 清掉 Service Worker 与全部 Cache Storage，防止旧壳被固化在客户端。 */
export async function purgeClientCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const names = await window.caches.keys();
      await Promise.all(names.map((name) => window.caches.delete(name)));
    }
  } catch {
    /* ignore */
  }
}

/**
 * 以唯一 URL 重新加载当前文档：绕过浏览器磁盘缓存与 CDN 边缘缓存。
 * 使用 `replace` 避免在历史记录里堆叠恢复页。
 */
export function reloadDocumentBypassingCache(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(RECOVERY_PARAM, Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * 申请一次自愈：额度允许时清理缓存并重载文档，返回 true；
 * 额度用尽时不做任何跳转，返回 false，交由上层展示终态页面。
 */
export async function recoverStaleAssets(): Promise<boolean> {
  const attempt = readAttempt();
  if (attempt.count >= MAX_AUTO_RECOVERIES) return false;
  writeAttempt(attempt.count + 1);
  await purgeClientCaches();
  reloadDocumentBypassingCache();
  return true;
}

/** 启动时清掉自愈用的临时查询参数，保持地址栏干净。 */
export function stripRecoveryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(RECOVERY_PARAM)) return;
    url.searchParams.delete(RECOVERY_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}
