/**
 * 简单的 Markdown 渲染工具
 * 支持：
 * - **粗体**
 * - 真实换行符（\n）
 * - 字面量 \n（数据库中输入的 \\n）
 */
export function renderSimpleMarkdown(text: string): string {
    if (!text) return '';

    // 1. 处理粗体：**text** -> <strong>text</strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. 处理字面量 \n（数据库中输入的 \\n）
    html = html.replace(/\\n/g, '<br/>');

    // 3. 处理真实换行符
    html = html.replace(/\n/g, '<br/>');

    return html;
}

/**
 * React 组件中使用的 Markdown 渲染
 * 使用 dangerouslySetInnerHTML
 */
export function MarkdownText({ text, className = '' }: { text: string; className?: string }) {
    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(text) }}
        />
    );
}
