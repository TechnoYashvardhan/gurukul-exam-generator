import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function formatInitialContent(raw: string): string {
  if (!raw) return '';
  if (raw.trim().startsWith('<')) return raw;
  return raw
    .split('\n')
    .map((line) => `<p>${line.trim() ? line : '<br>'}</p>`)
    .join('');
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `rte-btn ${active ? 'rte-btn--active' : ''}`;

  return (
    <div className="rte-toolbar">
      <div className="rte-toolbar__group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="Bold"
          aria-label="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="Italic"
          aria-label="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}
          title="Underline"
          aria-label="Underline"
        >
          <UnderlineIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
      </div>

      <div className="rte-divider" />

      <div className="rte-toolbar__group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={btnClass(editor.isActive('superscript'))}
          title="Superscript"
          aria-label="Superscript"
        >
          <SuperscriptIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={btnClass(editor.isActive('subscript'))}
          title="Subscript"
          aria-label="Subscript"
        >
          <SubscriptIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={btnClass(editor.isActive('highlight'))}
          title="Highlight Text"
          aria-label="Highlight"
        >
          <Highlighter size={14} />
        </button>
      </div>

      <div className="rte-divider" />

      <div className="rte-toolbar__group">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btnClass(editor.isActive({ textAlign: 'left' }))}
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btnClass(editor.isActive({ textAlign: 'center' }))}
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btnClass(editor.isActive({ textAlign: 'right' }))}
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight size={14} />
        </button>
      </div>

      <div className="rte-divider" />

      <div className="rte-toolbar__group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="Ordered List"
          aria-label="Ordered List"
        >
          <ListOrdered size={14} />
        </button>
      </div>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const formattedContent = formatInitialContent(content);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: formattedContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'gk-rte-content',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      const normalized = formatInitialContent(content);
      if (normalized !== editor.getHTML()) {
        editor.commands.setContent(normalized, false);
      }
    }
  }, [content, editor]);

  return (
    <div className="rte-container">
      <MenuBar editor={editor} />
      <div className="rte-editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
