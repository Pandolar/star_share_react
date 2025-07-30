# PostMessage 通信集成文档

## 概述

本次更新为用户中心添加了完整的 postMessage 通信功能，在退出登录时能够自动通知多个目标域名。这让您可以在 iframe 环境中实现更好的跨域通信。

## 核心功能

### 1. 退出登录时自动通知

当用户在用户中心或管理后台退出登录时，系统会自动向配置的目标域名发送 postMessage 通知。

**默认配置的目标域名:**
- `https://niceaigc.com`
- `https://share.niceaigc.com` 
- `https://goplus.niceaigc.com`
- `https://api.niceaigc.com`

### 2. 参数化目标域名

您可以通过配置文件或动态设置来自定义目标域名列表。

## 使用方法

### 基本用法

```typescript
import { postNavigate, notifyLogout, logoutAndNotify } from './utils/postMessage';

// 1. 页面导航
postNavigate('https://example.com', true);  // 新窗口打开
postNavigate('/dashboard', false);          // 当前窗口跳转

// 2. 发送退出登录通知
notifyLogout(); // 使用默认配置
notifyLogout(['https://custom1.com', 'https://custom2.com']); // 自定义目标

// 3. 完整退出登录流程
logoutAndNotify(['https://target1.com', 'https://target2.com']);
```

### 配置目标域名

#### 方法1: 修改配置文件

编辑 `src/config/index.ts`:

```typescript
postMessage: {
  logoutTargets: [
    'https://your-main-site.com',
    'https://your-sub-site.com',
    // 添加更多目标域名
  ],
  defaultTarget: 'https://your-main-site.com',
}
```

#### 方法2: 动态设置

```typescript
import { setPostMessageConfig } from './utils/postMessage';

setPostMessageConfig({
  targetOrigins: ['https://new-target.com'],
  defaultTargetOrigin: 'https://new-target.com'
});
```

### 退出登录流程

现在的退出登录流程如下：

1. **发送通知** - 向所有目标域名发送 postMessage
2. **等待确认** - 等待 100-150ms 确保消息发送完成
3. **清除数据** - 清除 localStorage、sessionStorage 和 cookies
4. **页面跳转** - 跳转到目标页面

## 消息格式

### 退出登录通知

```json
{
  "action": "logout",
  "timestamp": 1234567890,
  "source": "user-center"
}
```

### 页面导航

```json
{
  "action": "navigate", 
  "url": "https://example.com",
  "newWindow": false
}
```

### 自定义消息

```json
{
  "action": "custom-action",
  "data": { "userId": 123 },
  "timestamp": 1234567890
}
```

## 监听消息

在接收方页面，您需要监听 postMessage 事件：

```javascript
window.addEventListener('message', (event) => {
  // 验证来源
  if (event.origin !== 'https://your-trusted-domain.com') {
    return;
  }
  
  const { action, ...data } = event.data;
  
  switch (action) {
    case 'logout':
      // 处理退出登录通知
      console.log('用户已退出登录', data);
      // 执行你的退出登录逻辑
      break;
      
    case 'navigate':
      // 处理导航请求
      if (data.newWindow) {
        window.open(data.url);
      } else {
        window.location.href = data.url;
      }
      break;
      
    default:
      console.log('收到未知消息:', action, data);
  }
});
```

## 测试工具

我们提供了一个演示组件 `PostMessageDemo` 来测试 postMessage 功能：

```typescript
import { PostMessageDemo } from './components/PostMessageDemo';

// 在你的页面中使用
<PostMessageDemo />
```

## 安全注意事项

1. **验证来源**: 始终验证 `event.origin` 确保消息来自可信源
2. **消息验证**: 验证消息格式和内容的有效性
3. **错误处理**: 妥善处理 postMessage 发送失败的情况

## 兼容性

- ✅ 现代浏览器 (Chrome, Firefox, Safari, Edge)
- ✅ 移动端浏览器
- ✅ iframe 环境
- ❌ IE11 及以下版本

## 故障排除

### 消息发送失败

1. 检查目标域名是否正确
2. 确认接收方页面已正确监听 message 事件
3. 查看浏览器控制台的错误日志

### 跨域问题

1. 确保目标域名在 postMessage 配置中
2. 验证接收方的 origin 检查逻辑
3. 检查浏览器的安全策略设置

## 示例项目

查看 `src/components/PostMessageDemo.tsx` 获取完整的使用示例和测试界面。 