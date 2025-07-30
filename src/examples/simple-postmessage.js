/**
 * 简化版 postMessage 使用示例
 * 适配外部主网页的简化监听逻辑
 */

// 方式1: 在React组件中使用
import { postNavigate, notifyLogout, logoutAndNotify, postMessageToParent } from '../utils/postMessage';

// 基本导航
function handleNavigation() {
  // 当前窗口跳转
  postNavigate('/dashboard');
  
  // 新窗口打开
  postNavigate('https://example.com', true);
}

// 退出登录
function handleLogout() {
  // 方式1: 仅发送通知
  notifyLogout();
  
  // 方式2: 完整退出登录流程
  logoutAndNotify(); // 发送通知 + 清除数据 + 跳转
}

// 发送自定义消息
function sendCustomMessage() {
  postMessageToParent({
    action: 'custom-action',
    data: { userId: 123, message: 'hello' }
  });
}

// 方式2: 直接在HTML中使用 (类似您提供的示例)
/*
<script>
// 发送跳转指令（无需关心 origin）
function jumpTo(url, inNewWindow = false) {
    window.parent.postMessage({
        action: 'navigate',
        url: url,
        newWindow: !!inNewWindow
    }, '*'); // 注意：使用 '*' 表示任意目标 origin
}

// 发送退出登录通知
function notifyParentLogout() {
    window.parent.postMessage({
        action: 'logout',
        timestamp: Date.now(),
        source: 'user-center'
    }, '*');
}
</script>

<!-- 使用示例 -->
<button onclick="jumpTo('https://example.com', true)">
  新窗口打开 Example
</button>

<button onclick="jumpTo('/dashboard')">
  当前页跳转到 Dashboard
</button>

<button onclick="notifyParentLogout()">
  发送退出登录通知
</button>
*/

// 外部主网页的监听逻辑 (您已经实现)
/*
function setupMessageListener() {
    console.log('[通信] 已启动消息监听（不校验来源）');

    window.addEventListener('message', function (event) {
        const data = event.data;

        // 仅检查必要字段
        if (data && data.action === 'navigate' && typeof data.url === 'string') {
            console.log('[通信] 收到跳转指令:', data);

            if (data.newWindow === true) {
                window.open(data.url, '_blank');
            } else {
                window.location.href = data.url;
            }
        } else {
            console.log('[通信] 收到未知消息，忽略:', data);
        }
    });
}
*/ 