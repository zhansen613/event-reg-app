'use client'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Markdown renderer with:
 * - GFM enabled (autolinks, tables, strikethrough, task lists)
 * - Open links in new tab
 * - Read-only checkboxes for task lists
 * - Nice, compact typography
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        // GFM gives us autolink literals and task lists (- [ ] / - [x])
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="mt-4 text-2xl font-semibold" {...props} />,
          h2: ({node, ...props}) => <h2 className="mt-3 text-xl font-semibold" {...props} />,
          h3: ({node, ...props}) => <h3 className="mt-2.5 text-lg font-semibold" {...props} />,
          p:  ({node, ...props}) => <p className="mt-2 text-sm leading-6" {...props} />,
          ul: ({node, ...props}) => <ul className="mt-2 list-disc pl-5 text-sm leading-6" {...props} />,
          ol: ({node, ...props}) => <ol className="mt-2 list-decimal pl-5 text-sm leading-6" {...props} />,
          li: ({node, ...props}) => <li className="mt-1" {...props} />,
          a:  ({node, ...props}) => <a className="underline" target="_blank" rel="noopener noreferrer" {...props} />,
          // Make task-list checkboxes read-only & spaced
          input: ({node, ...props}) => {
            // Only checkboxes show up from remark-gfm task lists
            if ((props as any).type === 'checkbox') {
              return <input type="checkbox" disabled className="mr-2 align-middle" {...props} />
            }
            return <input {...props} />
          },
          // Optional: inline code style (not code blocks)
          code: ({node, inline, ...props}) =>
            inline
              ? <code className="px-1 py-0.5 rounded bg-gray-100" {...props} />
              : <code {...props} />
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
