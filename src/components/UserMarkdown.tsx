import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UserMarkdownProps {
  children: string;
}

export const UserMarkdown: React.FC<UserMarkdownProps> = ({ children }) => (
  <div className="prose prose-slate max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children: heading }) => <h1 className="mb-4 border-b border-default-200 pb-2 text-2xl font-bold text-default-900">{heading}</h1>,
        h2: ({ children: heading }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-default-800">{heading}</h2>,
        h3: ({ children: heading }) => <h3 className="mb-2 mt-5 text-lg font-medium text-default-700">{heading}</h3>,
        p: ({ children: paragraph }) => <p className="mb-4 leading-relaxed text-default-600">{paragraph}</p>,
        ul: ({ children: list }) => <ul className="mb-4 list-inside list-disc space-y-1 text-default-600">{list}</ul>,
        ol: ({ children: list }) => <ol className="mb-4 list-inside list-decimal space-y-1 text-default-600">{list}</ol>,
        li: ({ children: item }) => <li className="pl-2">{item}</li>,
        blockquote: ({ children: quote }) => <blockquote className="my-4 rounded-r-lg border-l-4 border-primary/30 bg-primary/5 py-2 pl-4">{quote}</blockquote>,
        code: ({ children: code, ...props }) => (props as { inline?: boolean }).inline
          ? <code className="rounded bg-default-100 px-1.5 py-0.5 text-sm text-primary">{code}</code>
          : <code className="block overflow-x-auto rounded-lg bg-default-100 p-4 text-sm">{code}</code>,
        strong: ({ children: text }) => <strong className="font-semibold text-default-900">{text}</strong>,
        em: ({ children: text }) => <em className="italic text-default-700">{text}</em>,
        a: ({ href, children: link }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary-600">{link}</a>,
        table: ({ children: table }) => <div className="my-4 overflow-x-auto"><table className="min-w-full rounded-lg border border-default-200">{table}</table></div>,
        thead: ({ children: head }) => <thead className="bg-default-50">{head}</thead>,
        tbody: ({ children: body }) => <tbody className="divide-y divide-default-200">{body}</tbody>,
        tr: ({ children: row }) => <tr className="hover:bg-default-50">{row}</tr>,
        th: ({ children: cell }) => <th className="border-r border-default-200 px-4 py-2 text-left text-sm font-medium text-default-700 last:border-r-0">{cell}</th>,
        td: ({ children: cell }) => <td className="border-r border-default-200 px-4 py-2 text-sm text-default-600 last:border-r-0">{cell}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
