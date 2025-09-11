'use client'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Markdown({ children }: { children: string }) {
  // No raw HTML allowed; supports **bold**, _italic_, lists, links, and # headings.
  return (
    <div className="markdown">
      <ReactMarkdown
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
          strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
          em: ({node, ...props}) => <em className="italic" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
