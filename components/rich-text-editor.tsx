'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Link2Off,
} from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function RichTextEditor({ value, onChange, placeholder, disabled }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: 'text-green-300 underline' },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value || '',
    editable: !disabled,
    // Next.js SSR: TipTap warns unless we disable immediate render
    immediatelyRender: false,
    onUpdate({ editor }) {
      // TipTap returns "<p></p>" for an empty editor — collapse that to ""
      // so the API treats it as no notes (the route does `notes || null`).
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[80px] max-h-[200px] overflow-y-auto rounded-b-md border border-t-0 border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-green-300 [&_a]:underline',
      },
    },
  })

  // Keep the editor in sync if `value` changes from outside (e.g. form reset)
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) return null

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  function promptForLink() {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', previous ?? 'https://')
    if (url === null) return // user cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-gray-700 bg-[#0f1117] px-2 py-1.5">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bulleted list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={promptForLink}
        label="Link"
      >
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      {editor.isActive('link') && (
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
          label="Remove link"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}
    </div>
  )
}

function Separator() {
  return <span className="mx-0.5 h-4 w-px bg-gray-700" aria-hidden />
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded cursor-pointer transition-colors ${
        active
          ? 'bg-green-400/20 text-green-200'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
