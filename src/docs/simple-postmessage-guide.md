# 简化版 PostMessage 通信指南

## 概述

根据您的外部主网页监听逻辑，我们已经将 postMessage 通信功能简化为更直接的实现方式：

- ✅ 使用 `'*'` 作为 targetOrigin，无需校验来源域名
- ✅ 简化消息格式，只检查必要字段
- ✅ 移除复杂的多域名配置
- ✅ 保持与您现有监听逻辑的完美兼容

## 快速使用

### 基本导航

```typescript
import { postNavigate } from './utils/postMessage';

// 当前窗口跳转
postNavigate('/dashboard');

// 新窗口打开
postNavigate('https://example.com', true);
```

### 退出登录通知

```typescript
import { notifyLogout, logoutAndNotify } from './utils/postMessage';

// 仅发送通知
notifyLogout(); // 自动获取当前页面地址
notifyLogout('/login'); // 手动指定跳转到登录页

// 完整退出登录（推荐）
logoutAndNotify(); // 自动获取地址 + 发送通知 + 清除数据 + 跳转
logoutAndNotify('/login'); // 发送通知 + 清除数据 + 跳转到登录页
```

#### 自动地址获取策略

当不指定 `redirectUrl` 时，系统会自动获取当前页面地址：

- **用户中心页面**：如果当前路径包含 `/user-center`，则跳转到主域名根路径
- **其他页面**：保持当前完整地址

例如：
- 当前在 `https://niceaigc.com/user-center` → 跳转到 `https://niceaigc.com/`
- 当前在 `https://example.com/dashboard` → 跳转到 `https://example.com/dashboard`

### 配置跳转策略

编辑 `src/config/index.ts` 自定义退出登录的跳转行为：

```typescript
postMessage: {
  logoutRedirect: {
    // 跳转策略
    strategy: 'auto', // 'auto' | 'custom' | 'current'
    // 自定义URL（仅当strategy为'custom'时使用）
    customUrl: '/',
  },
}
```

#### 跳转策略说明

- **`auto`**（推荐）：自动获取当前页面地址，用户中心跳转到主域名根路径
- **`custom`**：使用 `customUrl` 指定的固定URL
- **`current`**：始终跳转到当前完整地址

#### 示例配置

```typescript
// 总是跳转到首页
logoutRedirect: {
  strategy: 'custom',
  customUrl: '/',
}

// 总是跳转到当前地址
logoutRedirect: {
  strategy: 'current',
}

// 智能跳转（默认）
logoutRedirect: {
  strategy: 'auto',
}
```

### 自定义消息

```typescript
import { postMessageToParent } from './utils/postMessage';

postMessageToParent({
  action: 'custom-action',
  data: { userId: 123 }
});
```

## 原生 JavaScript 使用

如果您想直接在HTML中使用，类似您提供的示例：

```html
<script>
// 发送跳转指令
function jumpTo(url, inNewWindow = false) {
    window.parent.postMessage({
        action: 'navigate',
        url: url,
        newWindow: !!inNewWindow
    }, '*');
}

// 发送退出登录通知（自动获取当前地址）
function sendLogoutNotify() {
    // 获取目标URL
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;
    let targetUrl;
    
    if (currentPath.includes('/user-center')) {
        targetUrl = currentOrigin + '/';
    } else {
        targetUrl = window.location.href;
    }
    
    window.parent.postMessage({
        action: 'navigate',
        url: targetUrl,
        newWindow: false
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

<button onclick="sendLogoutNotify()">
  发送退出登录通知
</button>
```

## 消息格式

### 导航消息
```json
{
  "action": "navigate",
  "url": "https://example.com",
  "newWindow": true
}
```

### 退出登录通知
```json
{
  "action": "navigate",
  "url": "/",
  "newWindow": false
}
```
**注意：退出登录现在直接发送导航消息，让主页面跳转到指定URL**

## 外部主网页监听（您已实现）

您的外部主网页监听逻辑已经完美适配：

```javascript
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
```

## 主要变化

与之前的复杂版本相比，现在的实现：

### ✅ 简化内容
- 移除了多域名配置
- 移除了 origin 校验
- 使用 `'*'` 作为通用目标
- 简化了API调用

### ✅ 保留功能
- 基本导航功能
- 退出登录通知
- 自定义消息发送
- 完整的错误处理

### ✅ 新增便利
- 更简单的函数调用
- 更好的控制台日志
- 与现有监听逻辑的完美匹配

## 迁移指南

如果您之前使用了复杂版本，迁移很简单：

```typescript
// 之前
postNavigate(url, newWindow, 'https://specific-domain.com');
notifyLogout(['https://domain1.com', 'https://domain2.com']);

// 现在
postNavigate(url, newWindow);
notifyLogout();
```

## 故障排除

### 问题：退出登录时主页面没有跳转

**原因分析：**
- 之前的退出登录发送的是 `{ action: 'logout', ... }` 消息
- 您的主页面监听代码只处理 `action === 'navigate'` 的消息
- 所以 `logout` 消息被忽略，主页面没有反应

**解决方案：**
- 现在退出登录直接发送 `navigate` 消息
- 消息格式：`{ action: 'navigate', url: '当前页面地址', newWindow: false }`
- 自动获取当前页面地址，用户中心跳转到主域名根路径
- 完美适配您的监听逻辑，确保主页面会跳转

### 检查清单

1. ✅ 确认主页面监听代码已启动
2. ✅ 检查控制台是否有 `[通信] 收到跳转指令:` 日志
3. ✅ 验证消息格式是否为 `navigate` action
4. ✅ 确认 URL 字段存在且为字符串类型

## 测试

### 使用演示组件测试：

```typescript
import { PostMessageDemo } from './components/PostMessageDemo';

// 在您的页面中添加
<PostMessageDemo />
```

### 使用独立测试页面：

打开 `web/src/test/postmessage-test.html` 进行完整的消息通信测试。

现在您的 postMessage 通信系统已经完全适配您的简化监听逻辑！🎉 