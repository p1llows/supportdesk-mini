import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Code, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'CODE',
  'PRE',
  'UL',
  'OL',
  'LI',
  'P',
  'DIV',
  'BR',
  'A',
]);

function sanitizeHref(href: string | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function domNodeToReact(node: Node, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  const children = Array.from(el.childNodes).map((child, idx) =>
    domNodeToReact(child, `${key}-${idx}`)
  );

  if (!ALLOWED_TAGS.has(tag)) {
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }

  switch (tag) {
    case 'B':
    case 'STRONG':
      return (
        <strong key={key} className="font-bold text-stone-900">
          {children}
        </strong>
      );
    case 'I':
    case 'EM':
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case 'U':
      return (
        <u key={key} className="underline">
          {children}
        </u>
      );
    case 'PRE':
      return (
        <pre
          key={key}
          className="my-2 overflow-x-auto rounded-lg border border-[#E5E2DA] bg-[#F7F6F2] p-3 font-mono text-xs leading-relaxed text-stone-800"
        >
          {children}
        </pre>
      );
    case 'CODE':
      return (
        <code
          key={key}
          className="rounded border border-[#E5E2DA] bg-[#FAF9F6] px-1.5 py-0.5 font-mono text-[12px] text-[#0F766E]"
        >
          {children}
        </code>
      );
    case 'UL':
      return (
        <ul key={key} className="my-1.5 list-disc space-y-1 pl-5 text-sm text-stone-700">
          {children}
        </ul>
      );
    case 'OL':
      return (
        <ol key={key} className="my-1.5 list-decimal space-y-1 pl-5 text-sm text-stone-700">
          {children}
        </ol>
      );
    case 'LI':
      return <li key={key}>{children}</li>;
    case 'BR':
      return <br key={key} />;
    case 'A': {
      const safeHref = sanitizeHref(el.getAttribute('href'));
      if (!safeHref) return <React.Fragment key={key}>{children}</React.Fragment>;
      return (
        <a
          key={key}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#0F766E] underline decoration-[#0F766E]/40 underline-offset-2 hover:text-[#115E59]"
        >
          {children}
        </a>
      );
    }
    case 'P':
    case 'DIV':
    default:
      return (
        <div key={key} className="text-sm leading-relaxed text-stone-700 break-words">
          {children}
        </div>
      );
  }
}

export function RichTextDisplay({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) {
    return <p className="text-xs italic text-stone-400">No content.</p>;
  }

  // If content contains HTML tags from the WYSIWYG editor, safely parse into React nodes
  if (/<[a-z][\s\S]*>/i.test(content)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const nodes = Array.from(doc.body.childNodes).map((child, idx) =>
      domNodeToReact(child, `rt-${idx}`)
    );
    return <div className={cn('space-y-1', className)}>{nodes}</div>;
  }

  // Plain text fallback (preserves line breaks)
  return (
    <p className={cn('text-sm leading-relaxed text-stone-700 whitespace-pre-wrap break-words', className)}>
      {content}
    </p>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'Write here...',
  rows = 4,
  maxLength = 5000,
  disabled = false,
  required = false,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    ul: false,
    ol: false,
  });

  // Sync external value resets (e.g. clearing form after submit or opening edit modal)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const updateToolbarState = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // Ignore in non-DOM test environments
    }
  }, []);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const textOnly = (el.textContent || '').trim();
    const html = textOnly === '' && !el.querySelector('ul, ol') ? '' : el.innerHTML;
    if (html.length <= maxLength) {
      onChange(html);
    }
    updateToolbarState();
  };

  const exec = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const insertCode = () => {
    if (disabled) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    // If cursor is already inside a <pre> or <code>, toggle back to normal paragraph
    const anchorEl =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as HTMLElement)
        : range.commonAncestorContainer.parentElement;
    if (anchorEl?.closest('pre') || anchorEl?.closest('code')) {
      document.execCommand('formatBlock', false, 'div');
      emitChange();
      return;
    }

    const selectedText = selection.toString();
    if (selectedText && !selectedText.includes('\n')) {
      // Inline code: insert <code> and move caret outside so subsequent typing is normal text
      const codeEl = document.createElement('code');
      codeEl.textContent = selectedText;
      range.deleteContents();
      range.insertNode(codeEl);
      const space = document.createTextNode('\u00A0');
      codeEl.after(space);
      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Multi-line or empty selection: insert a clean code block (<pre>)
      document.execCommand('formatBlock', false, 'pre');
    }
    emitChange();
  };

  const insertLink = () => {
    if (disabled) return;
    const url = window.prompt('Enter URL (https://...)');
    if (!url || !/^https?:\/\//i.test(url.trim())) return;
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      document.execCommand('createLink', false, url.trim());
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer">${url.trim()}</a>`
      );
    }
    emitChange();
  };

  const minHeightPx = Math.max(88, rows * 24);
  const isEmpty = !value || value.replace(/<[^>]+>/g, '').trim() === '';

  const toolbarBtn = (active: boolean) =>
    cn(
      'rounded p-1.5 transition-colors disabled:opacity-40',
      active
        ? 'bg-[#0F766E] text-white'
        : 'text-stone-500 hover:bg-[#E7E4DC] hover:text-stone-900'
    );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-[#E5E2DA] bg-white focus-within:border-[#0F766E] focus-within:ring-2 focus-within:ring-[#0F766E]/15',
        className
      )}
    >
      {/* WYSIWYG Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#E5E2DA] bg-[#FAF9F6] px-2.5 py-1.5">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('bold');
          }}
          disabled={disabled}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          aria-pressed={activeFormats.bold}
          className={toolbarBtn(activeFormats.bold)}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('italic');
          }}
          disabled={disabled}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          aria-pressed={activeFormats.italic}
          className={toolbarBtn(activeFormats.italic)}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertCode();
          }}
          disabled={disabled}
          title="Code / Code Block"
          aria-label="Code"
          className={toolbarBtn(false)}
        >
          <Code className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-[#E5E2DA]" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('insertUnorderedList');
          }}
          disabled={disabled}
          title="Bullet List"
          aria-label="Bullet list"
          aria-pressed={activeFormats.ul}
          className={toolbarBtn(activeFormats.ul)}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec('insertOrderedList');
          }}
          disabled={disabled}
          title="Numbered List"
          aria-label="Numbered list"
          aria-pressed={activeFormats.ol}
          className={toolbarBtn(activeFormats.ol)}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertLink();
          }}
          disabled={disabled}
          title="Insert Link"
          aria-label="Insert link"
          className={toolbarBtn(false)}
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ContentEditable Surface */}
      <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-stone-400">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-required={required}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyUp={updateToolbarState}
          onMouseUp={updateToolbarState}
          style={{ minHeight: `${minHeightPx}px` }}
          className="w-full max-h-72 overflow-y-auto bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-900 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[#E5E2DA] [&_pre]:bg-[#F7F6F2] [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:rounded [&_code]:border [&_code]:border-[#E5E2DA] [&_code]:bg-[#FAF9F6] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-[#0F766E] [&_a]:text-[#0F766E] [&_a]:underline"
        />
      </div>
    </div>
  );
}
