'use client'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Markdown renderer with:
 * - GFM enabled (autolinks, tables, strikethrough, task lists)
 * - Open links in new tab
 * - Read-only checkboxes for task lists
 * - Compact, pleasant typography
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="mt-4 text-2xl font-semibold" {...props} />,
          h2: (props) => <h2 className="mt-3 text-xl font-semibold" {...props} />,
          h3: (props) => <h3 className="mt-2.5 text-lg font-semibold" {...props} />,
          p:  (props) => <p className="mt-2 text-sm leading-6" {...props} />,
          ul: (props) => <ul className="mt-2 list-disc pl-5 text-sm leading-6" {...props} />,
          ol: (props) => <ol className="mt-2 list-decimal pl-5 text-sm leading-6" {...props} />,
          li: (props) => <li className="mt-1" {...props} />,
          a:  (props) => <a className="underline" target="_blank" rel="noopener noreferrer" {...props} />,
          // Task-list checkboxes → read-only
          input: (props: any) => {
            if (props.type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  disabled
                  className="mr-2 align-middle"
                  checked={!!props.checked}
                  readOnly
                />
              )
            }
            return <input {...props} />
          },
          // Inline vs block code: TypeScript-safe by treating props as any
          code: (props: any) => {
            const { inline, className, children, ...rest } = props
            if (inline) {
              return <code className="px-1 py-0.5 rounded bg-gray-100">{children}</code>
            }
            // Let ReactMarkdown provide the surrounding <pre>, we just render <code>
            return <code className={className} {...rest}>{children}</code>
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
