# 简化SEO系统使用说明

## 概述

这是一个简单实用的SEO优化系统，提供基础的SEO功能，包括：

- ✅ 页面标题和描述优化
- ✅ 关键词设置
- ✅ Open Graph社交分享优化
- ✅ 搜索引擎robots设置
- ✅ 规范链接设置

## 文件结构

```
src/
├── types/seo.ts           # SEO配置类型定义
├── config/seo.ts          # SEO配置文件
├── components/SEOHead.tsx # SEO组件
└── pages/HomePage.tsx     # 使用示例
```

## 基础用法

### 1. 使用现有配置

```tsx
import SEOHead from '../components/SEOHead';
import { homeSEOConfig } from '../config/seo';

const MyPage = () => {
  return (
    <>
      <SEOHead config={homeSEOConfig} />
      <div>页面内容</div>
    </>
  );
};
```

### 2. 自定义配置

```tsx
import SEOHead from '../components/SEOHead';

const MyPage = () => {
  const customSEOConfig = {
    title: '我的页面标题',
    description: '我的页面描述',
    keywords: '关键词1, 关键词2, 关键词3',
    ogTitle: '社交分享标题',
    ogDescription: '社交分享描述',
    ogImage: '/my-image.jpg',
    robots: 'index, follow'
  };

  return (
    <>
      <SEOHead config={customSEOConfig} />
      <div>页面内容</div>
    </>
  );
};
```

## 配置选项

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 页面标题 |
| `description` | string | ✅ | 页面描述 |
| `keywords` | string | ❌ | 关键词（逗号分隔） |
| `ogTitle` | string | ❌ | Open Graph标题 |
| `ogDescription` | string | ❌ | Open Graph描述 |
| `ogImage` | string | ❌ | Open Graph图片 |
| `canonical` | string | ❌ | 规范链接 |
| `robots` | string | ❌ | 搜索引擎指令 |

## 添加新页面SEO

1. 在 `src/config/seo.ts` 中添加配置：

```typescript
export const aboutSEOConfig: SEOConfig = {
  title: '关于我们 - NiceAIGC',
  description: '了解NiceAIGC团队和我们的使命',
  keywords: '关于我们, NiceAIGC, 团队介绍',
  ogTitle: '关于NiceAIGC',
  ogDescription: '了解我们的故事和使命',
  ogImage: '/about-og.jpg',
  robots: 'index, follow'
};
```

2. 在页面中使用：

```tsx
import SEOHead from '../components/SEOHead';
import { aboutSEOConfig } from '../config/seo';

const AboutPage = () => {
  return (
    <>
      <SEOHead config={aboutSEOConfig} />
      <div>关于我们页面内容</div>
    </>
  );
};
```

## SEO最佳实践

### 标题优化
- 长度控制在50-60字符
- 包含核心关键词
- 品牌名称放在末尾

### 描述优化
- 长度控制在150-160字符
- 包含核心关键词和行动号召
- 准确描述页面内容

### 关键词优化
- 数量控制在3-5个
- 避免关键词堆砌
- 使用长尾关键词

### 图片优化
- 使用1200x630像素的Open Graph图片
- 确保图片加载快速
- 设置合适的alt属性

## 验证SEO效果

推荐使用以下工具测试：

1. **Google Search Console** - 检查页面索引
2. **Facebook分享调试器** - 测试Open Graph
3. **Chrome DevTools** - 检查meta标签
4. **Google PageSpeed Insights** - 性能优化

现在你的网站已经有了基础的SEO优化！🚀 