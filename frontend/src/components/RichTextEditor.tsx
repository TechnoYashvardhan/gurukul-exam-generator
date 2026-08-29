import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
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
          <select
          className="gk-input"
          style={{ width: '150px', height: '28px', padding: '0 8px', fontSize: '12.5px', borderRadius: '4px' }}
          onChange={(e) => {
            if (e.target.value === 'default') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(e.target.value).run();
            }
          }}
          value={editor.getAttributes('textStyle').fontFamily || 'default'}
        >
          <option value="default">Default Font</option>
          <optgroup label="Serif">
            <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>Merriweather</option>
            <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>Playfair Display</option>
            <option value="Lora" style={{ fontFamily: 'Lora' }}>Lora</option>
            <option value="Cinzel" style={{ fontFamily: 'Cinzel' }}>Cinzel</option>
          </optgroup>
          <optgroup label="Sans-Serif">
            <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
            <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>Open Sans</option>
            <option value="Lato" style={{ fontFamily: 'Lato' }}>Lato</option>
            <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
            <option value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald</option>
            <option value="Raleway" style={{ fontFamily: 'Raleway' }}>Raleway</option>
            <option value="Nunito" style={{ fontFamily: 'Nunito' }}>Nunito</option>
            <option value="Rubik" style={{ fontFamily: 'Rubik' }}>Rubik</option>
            <option value="Work Sans" style={{ fontFamily: 'Work Sans' }}>Work Sans</option>
            <option value="Fira Sans" style={{ fontFamily: 'Fira Sans' }}>Fira Sans</option>
            <option value="Quicksand" style={{ fontFamily: 'Quicksand' }}>Quicksand</option>
          </optgroup>
          <optgroup label="Handwriting & Ancient">
            <option value="Jaini" style={{ fontFamily: 'Jaini' }}>Jaini</option>
            <option value="Amita" style={{ fontFamily: 'Amita' }}>Amita</option>
            <option value="Great Vibes" style={{ fontFamily: 'Great Vibes' }}>Great Vibes</option>
          </optgroup>
          <optgroup label="Monospace">
            <option value="Inconsolata" style={{ fontFamily: 'Inconsolata' }}>Inconsolata</option>
            <option value="JetBrains Mono" style={{ fontFamily: 'JetBrains Mono' }}>JetBrains Mono</option>
          </optgroup>
        </select>
      </div>

      <div className="rte-divider" />

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
        underline: false as any,
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      FontFamily,
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
        editor.commands.setContent(normalized, { emitUpdate: false });
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
