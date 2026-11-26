'use client';

import * as React from 'react';
import { Bold, Italic, List, ListOrdered, Minus, Quote, Strikethrough, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Soạn tin dạng HTML. Zalo chỉ hiểu một tập định dạng hẹp (đậm, nghiêng, gạch
 * chân, gạch ngang, 4 màu, cỡ nhỏ/lớn, danh sách, thụt lề) nên thanh công cụ chỉ
 * mở đúng những thứ đó — phần còn lại server sẽ tự lược bỏ khi gửi.
 */
const ZALO_COLORS = [
  { label: 'Đỏ', value: '#db342e' },
  { label: 'Cam', value: '#f27806' },
  { label: 'Vàng', value: '#f7b503' },
  { label: 'Xanh lá', value: '#15a85f' },
];

type ToolbarButton = { label: string; icon?: React.ComponentType<{ className?: string }>; text?: string; run: () => void };

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder = 'Soạn nội dung tin nhắn…',
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = React.useState(false);

  // Chỉ ghi lại DOM khi nội dung bên ngoài khác hẳn, nếu không con trỏ sẽ nhảy về đầu mỗi lần gõ.
  React.useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const emit = () => onChange(editorRef.current?.innerHTML ?? '');

  const exec = (command: string, argument?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const buttons: ToolbarButton[] = [
    { label: 'Đậm', icon: Bold, run: () => exec('bold') },
    { label: 'Nghiêng', icon: Italic, run: () => exec('italic') },
    { label: 'Gạch chân', icon: Underline, run: () => exec('underline') },
    { label: 'Gạch ngang', icon: Strikethrough, run: () => exec('strikeThrough') },
    { label: 'Chữ nhỏ', text: 'A-', run: () => exec('fontSize', '2') },
    { label: 'Chữ lớn', text: 'A+', run: () => exec('fontSize', '5') },
    { label: 'Danh sách dấu đầu dòng', icon: List, run: () => exec('insertUnorderedList') },
    { label: 'Danh sách số', icon: ListOrdered, run: () => exec('insertOrderedList') },
    { label: 'Thụt lề', icon: Quote, run: () => exec('formatBlock', 'blockquote') },
    { label: 'Xóa định dạng', icon: Minus, run: () => exec('removeFormat') },
  ];

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-background transition-colors', focused && 'border-primary ring-2 ring-primary/15', disabled && 'opacity-60')}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-secondary/40 p-1.5">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.run}
            className="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none"
          >
            {button.icon ? <button.icon className="h-4 w-4" /> : button.text}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {ZALO_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={`Màu ${color.label}`}
            aria-label={`Màu ${color.label}`}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec('foreColor', color.value)}
            className="h-6 w-6 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 transition-transform hover:scale-110 disabled:pointer-events-none"
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung tin nhắn"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={() => { setFocused(false); emit(); }}
        onFocus={() => setFocused(true)}
        onPaste={(event) => {
          // Dán kèm HTML từ Word/Docs thường mang theo rác; giữ nguyên HTML đã lọc ở server
          // nhưng chặn ảnh và bảng bằng cách chỉ nhận text/html hoặc text thuần.
          const html = event.clipboardData.getData('text/html');
          if (!html) return;
          event.preventDefault();
          document.execCommand('insertHTML', false, html.replace(/<(img|table|thead|tbody|tr|td|th)\b[^>]*>/gi, ''));
          emit();
        }}
        className="scrollbar-thin zalo-editor max-h-72 min-h-36 overflow-y-auto px-3.5 py-3 text-sm leading-6 outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
