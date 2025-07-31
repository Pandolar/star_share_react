# 配置文件说明

## 概述

本项目的配置系统分为两个部分：
1. **域名配置** (`domains.ts`) - 所有与域名相关的配置
2. **应用配置** (`index.ts`) - 应用的其他配置项

## domains.ts - 域名配置

这个文件包含了所有与域名相关的配置项，方便统一管理和修改。

### 主要配置项

#### 基础域名设置
- `mainDomain`: 主域名
- `cookieDomain`: Cookie 作用域域名
- `staticDomain`: 静态资源域名
- `casdoorDomain`: Casdoor 认证域名

#### API 端点配置
- `apiBaseUrl`: API 基础 URL
- `loginApiUrl`: 登录 API URL  
- `userInfoApiUrl`: 获取用户信息 API URL

#### 跳转配置
- `redirectTargets`: 跳转目标域名映射表
- `defaultRedirectPath`: 默认跳转路径
- `loginPath`: 登录页面路径
- `callbackPath`: 回调处理路径

### 如何修改配置

1. 打开 `src/config/domains.ts` 文件
2. 修改 `domainConfig` 对象中的相应值
3. 保存文件，配置会自动生效

### 添加新的跳转目标

在 `redirectTargets` 对象中添加新的键值对：

```typescript
redirectTargets: {
  'share': 'https://share.niceaigc.com/',
  'admin': 'https://admin.niceaigc.com/',  // 新增
  'api': 'https://api.niceaigc.com/',      // 新增
}
```

### 更换整套域名

如果需要更换到新的域名系统，只需要修改以下几个关键配置：

```typescript
export const domainConfig: DomainConfig = {
  mainDomain: 'your-new-domain.com',           // 修改主域名
  cookieDomain: '.your-new-domain.com',        // 修改 Cookie 域名
  apiBaseUrl: 'https://your-new-domain.com',   // 修改 API 基础 URL
  staticDomain: 'https://static.your-new-domain.com', // 修改静态资源域名
  casdoorDomain: 'https://casdoor.your-new-domain.com', // 修改 Casdoor 域名
  // ... 其他配置会自动继承新域名
};
```

## index.ts - 应用配置

包含应用的其他配置项：

### API 配置
- `baseURL`: API 基础 URL
- `adminPath`: 管理员 API 路径
- `timeout`: 请求超时时间

### 应用配置
- `title`: 应用标题
- `description`: 应用描述
- `version`: 版本号

### 存储配置
- `tokenKey`: Token 存储键名
- `userKey`: 用户信息存储键名

### 业务配置
- `carouselInterval`: 轮播图间隔
- `pageSize`: 分页大小
- `maxFileSize`: 最大文件大小

### 外部链接
所有外部链接都会自动使用域名配置中的 `mainDomain`，确保域名的一致性。

## 工具函数

### 域名相关
- `getApiUrl(endpoint)`: 获取完整 API URL
- `getStaticUrl(path)`: 获取静态资源 URL
- `getRedirectTarget(domain)`: 获取跳转目标 URL
- `getCasdoorLogoutUrl(redirectUri, token?)`: 获取 Casdoor 注销 URL

### 应用相关
- `getAdminApiUrl(path)`: 获取管理员 API URL
- `getStoredToken()`: 获取存储的 Token
- `setStoredToken(token)`: 设置 Token
- `clearStoredToken()`: 清除 Token
- `isAuthenticated()`: 检查是否已登录

## 使用示例

```typescript
import { domainConfig, getCasdoorLogoutUrl } from './config/domains';
import config, { getAdminApiUrl, isAuthenticated } from './config';

// 使用域名配置
const loginUrl = getCasdoorLogoutUrl('https://example.com');

// 使用应用配置
const apiUrl = getAdminApiUrl('/users');
const isLoggedIn = isAuthenticated();

// 访问配置
console.log(config.app.title);
console.log(domainConfig.mainDomain);
```

## 注意事项

1. **域名更换**：更换域名时只需修改 `domains.ts` 文件
2. **类型安全**：所有配置都有 TypeScript 类型定义
3. **自动同步**：外部链接会自动使用主域名配置
4. **向后兼容**：保留了原有的所有配置功能 