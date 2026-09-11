/**
 * 自愈重载期间给异步 chunk 增加同一缓存绕过参数。
 *
 * 文档 URL 的 _r 只能绕过 index.html 的缓存；webpack 后续插入的 script
 * 仍可能请求没有查询参数的旧 chunk URL。仅在 _r 存在时改写，正常发布继续
 * 使用带 contenthash 的长期缓存。
 */
export function enableChunkCacheBypass(): void {
  if (typeof document === 'undefined') return;

  const recoveryParam = new URL(window.location.href).searchParams.get('_r');
  if (!recoveryParam || !document.head) return;

  const appendChild = document.head.appendChild.bind(document.head);
  document.head.appendChild = function appendChunk<T extends Node>(node: T): T {
    if (node instanceof HTMLScriptElement && node.src.includes('.chunk.js')) {
      const url = new URL(node.src, window.location.href);
      url.searchParams.set('_r', recoveryParam);
      node.src = url.toString();
    }
    return appendChild(node);
  };
}
