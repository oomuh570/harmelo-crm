import DOMPurify from 'isomorphic-dompurify'

type Props = {
  html: string
  className?: string
  emptyFallback?: React.ReactNode
}

// Sanitizes the HTML and renders it. Only allows the marks/blocks our editor produces.
export default function RichTextDisplay({ html, className, emptyFallback = '—' }: Props) {
  const cleaned = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })

  // Treat HTML that has no actual text (e.g. "<p></p>") as empty
  const hasText = cleaned.replace(/<[^>]*>/g, '').trim().length > 0

  if (!hasText) {
    return <span className="text-gray-600">{emptyFallback}</span>
  }

  return (
    <div
      className={`prose-sm prose-invert max-w-none text-sm text-gray-100 break-words [&_a]:text-green-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}
