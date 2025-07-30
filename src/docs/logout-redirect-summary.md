# 退出登录地址跳转功能说明

## 🎯 功能概述

现在退出登录时，主页面会跳转到和子页面（iframe）一样的地址，实现了智能跳转。

## 📍 跳转逻辑

### 自动获取策略（默认）

- **用户中心页面**：如果当前路径包含 `/user-center`，跳转到主域名根路径
- **其他页面**：保持当前完整地址

### 示例场景

| 当前子页面地址 | 主页面跳转地址 | 说明 |
|---|---|---|
| `https://niceaigc.com/user-center` | `https://niceaigc.com/` | 用户中心跳转到主页 |
| `https://example.com/dashboard` | `https://example.com/dashboard` | 保持当前地址 |
| `https://api.niceaigc.com/admin` | `https://api.niceaigc.com/admin` | 保持当前地址 |

## 🔧 技术实现

### 消息格式

```json
{
  "action": "navigate",
  "url": "自动获取的当前页面地址",
  "newWindow": false
}
```

### 核心代码

```typescript
// 自动获取目标URL
const currentOrigin = window.location.origin;
const currentPath = window.location.pathname;

let targetUrl;
if (currentPath.includes('/user-center')) {
  targetUrl = currentOrigin + '/';
} else {
  targetUrl = window.location.href;
}

// 发送导航消息
window.parent.postMessage({
  action: 'navigate',
  url: targetUrl,
  newWindow: false
}, '*');
```

## ⚙️ 配置选项

如果需要自定义跳转行为，可以在 `config/index.ts` 中配置：

```typescript
postMessage: {
  logoutRedirect: {
    strategy: 'auto', // 'auto' | 'custom' | 'current'
    customUrl: '/',   // 自定义URL（仅当strategy为'custom'时使用）
  },
}
```

### 策略说明

- **`auto`**：智能跳转（默认，推荐）
- **`custom`**：总是跳转到固定URL
- **`current`**：总是跳转到当前完整地址

## ✅ 兼容性

- ✅ 完美适配您的主页面监听逻辑
- ✅ 只处理 `action === 'navigate'` 消息
- ✅ 自动获取地址，无需手动配置
- ✅ 支持各种子页面场景

## 🧪 测试验证

使用测试页面验证功能：
```bash
打开: web/src/test/postmessage-test.html
点击: "测试退出登录（自动获取地址）"
```

现在退出登录时，主页面会智能跳转到合适的地址！🎉 