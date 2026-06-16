import { lazy, ComponentType } from 'react';

/**
 * 包装 React.lazy：当动态 import 因为陈旧的 chunk 缓存而失败（部署后旧 index.html
 * 仍引用已不存在的 chunk，导致 404 / ChunkLoadError）时，自动刷新一次页面以拉取最新资源。
 *
 * 用 sessionStorage 记录“已因该 chunk 刷新过”，避免真正的网络故障造成无限刷新循环。
 * 这解决了部分浏览器（尤其 macOS 上缓存更激进时）打开页面白屏、打开开发者工具禁用缓存后才正常的问题。
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    chunkName?: string,
) {
    return lazy(async () => {
        const storageKey = `chunk-reload-${chunkName || factory.toString().slice(0, 64)}`;
        try {
            const component = await factory();
            // 成功加载后清除标记，下次失败仍可再刷新一次
            try { window.sessionStorage.removeItem(storageKey); } catch {}
            return component;
        } catch (error) {
            let alreadyReloaded = false;
            try {
                alreadyReloaded = window.sessionStorage.getItem(storageKey) === '1';
            } catch {}

            if (!alreadyReloaded) {
                try { window.sessionStorage.setItem(storageKey, '1'); } catch {}
                // 强制从服务器重新加载，获取最新的 index.html 与 chunk 映射
                window.location.reload();
                // 返回一个永不 resolve 的占位，等待页面重载
                return new Promise<{ default: T }>(() => {});
            }
            // 已经刷新过仍失败，说明不是缓存问题，向上抛出交由 ErrorBoundary 处理
            throw error;
        }
    });
}
