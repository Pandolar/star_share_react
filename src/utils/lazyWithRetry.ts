import { lazy, ComponentType } from 'react';
import { isStaleAssetError, recoverStaleAssets } from './assetRecovery';

/**
 * 包装 React.lazy：动态 import 失败时先判断是否为「部署后旧 chunk 已下线」的资源版本不一致
 * （静态层会对缺失资源返回 200 index.html，浏览器按 ORB / MIME 拒绝执行，抛 ChunkLoadError）。
 *
 * 命中则清理 Service Worker / Cache Storage，并以唯一 URL 重新加载文档一次，绕过浏览器与 CDN
 * 的缓存键；额度用尽或非该类错误直接抛给 ErrorBoundary，由它展示可操作的终态页面。
 * 这里绝不重复 reload —— 之前「每个 chunk 各自重载一次 + ErrorBoundary 再重载 3 次 + 跳
 * /sharespeedtest」的组合正是线上「页面加载中 → 页面正在恢复中 → 优选节点」无限循环的来源。
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    chunkName?: string,
) {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error) {
            if (isStaleAssetError(error)) {
                console.error('[lazyWithRetry] chunk 加载失败，尝试清理缓存后重载', chunkName, error);
                if (await recoverStaleAssets()) {
                    // 页面正在重载：保持挂起，避免闪现错误页
                    return new Promise<{ default: T }>(() => {});
                }
            }
            throw error;
        }
    });
}
