import { NextResponse } from 'next/server';

// 添加正确的导出配置
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 简化API，确保不会出错
export async function GET() {
  // 使用简单的测试markdown数据
  const testData = {
    title: '测试公告',
    content: `# 测试公告标题

这是一个**测试公告**，用于验证公告功能是否正常工作。

## 功能列表
- 公告显示
- Markdown解析
- 24小时不提示功能

> 这是一个引用文本，测试Markdown格式

感谢您的使用！`
  };

  // 直接返回测试数据，不做任何可能导致错误的操作
  return new NextResponse(JSON.stringify(testData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 