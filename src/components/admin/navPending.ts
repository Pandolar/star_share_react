// 模块级“导航进行中”进度条：直接操作 DOM，不走 React 渲染。
// 原因：React Router 转场会保留旧页面直到新 chunk 就绪，期间该子树的 React 状态更新
// 不会提交，任何组件内的 loading 状态都渲染不出来；DOM 直控不受转场影响。
let showTimer: number | undefined;
let bar: HTMLDivElement | null = null;

const SPINNER_STYLE = 'width:16px;height:16px;border:2px solid rgba(0,111,238,.25);border-top-color:#006fee;border-radius:50%;animation:nav-pending-spin .8s linear infinite;';

const removeBar = () => {
    if (bar) { bar.remove(); bar = null; }
};

const showBar = () => {
    if (bar || typeof document === 'undefined') return;
    if (!document.getElementById('nav-pending-style')) {
        const style = document.createElement('style');
        style.id = 'nav-pending-style';
        style.textContent = '@keyframes nav-pending-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
    }
    bar = document.createElement('div');
    bar.setAttribute('data-nav-pending-bar', '');
    bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:10px;background:rgba(24,24,27,.85);color:#e4e4e7;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.25);pointer-events:none;';
    const spinner = document.createElement('div');
    spinner.style.cssText = SPINNER_STYLE;
    const label = document.createElement('span');
    label.textContent = '正在加载页面…';
    bar.append(spinner, label);
    document.body.appendChild(bar);
};

/** 点击导航时调用；200ms 内完成的切换不闪提示。 */
export const setPendingNavigation = (tab: string | null): void => {
    if (typeof window === 'undefined') return;
    if (showTimer !== undefined) { window.clearTimeout(showTimer); showTimer = undefined; }
    if (tab) showTimer = window.setTimeout(showBar, 200);
    else removeBar();
};

/** chunk 解析完成 / 加载失败时调用。 */
export const clearPendingNavigation = (): void => setPendingNavigation(null);
