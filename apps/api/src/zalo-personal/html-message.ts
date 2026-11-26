import { TextStyle, type Style } from 'zca-js';

/**
 * Zalo không render HTML — nó chỉ nhận văn bản thuần kèm một danh sách khoảng
 * định dạng (`styles`). Module này nhận HTML soạn từ trình editor của web rồi
 * dịch sang đúng cặp { text, styles } mà `api.sendMessage` hiểu được.
 *
 * Bảng màu của Zalo chỉ có 4 màu, nên màu bất kỳ trong HTML được quy về màu gần
 * nhất theo khoảng cách RGB.
 */

export type ZaloMessageContent = { text: string; styles: Style[] };

const MAX_LENGTH = 2000;

const ZALO_COLORS: Array<{ st: TextStyle; rgb: [number, number, number] }> = [
  { st: TextStyle.Red, rgb: [0xdb, 0x34, 0x2e] },
  { st: TextStyle.Orange, rgb: [0xf2, 0x78, 0x06] },
  { st: TextStyle.Yellow, rgb: [0xf7, 0xb5, 0x03] },
  { st: TextStyle.Green, rgb: [0x15, 0xa8, 0x5f] },
];

const NAMED_COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0], crimson: [220, 20, 60], firebrick: [178, 34, 34], maroon: [128, 0, 0],
  orange: [255, 165, 0], orangered: [255, 69, 0], coral: [255, 127, 80], tomato: [255, 99, 71],
  yellow: [255, 255, 0], gold: [255, 215, 0], khaki: [240, 230, 140], olive: [128, 128, 0],
  green: [0, 128, 0], lime: [0, 255, 0], teal: [0, 128, 128], seagreen: [46, 139, 87], forestgreen: [34, 139, 34],
  blue: [0, 0, 255], navy: [0, 0, 128], royalblue: [65, 105, 225], purple: [128, 0, 128], violet: [238, 130, 238],
  pink: [255, 192, 203], brown: [165, 42, 42], black: [0, 0, 0], gray: [128, 128, 128], grey: [128, 128, 128],
};

/** Các thẻ inline map thẳng sang style của Zalo. */
const TAG_STYLES: Record<string, TextStyle[]> = {
  b: [TextStyle.Bold], strong: [TextStyle.Bold],
  i: [TextStyle.Italic], em: [TextStyle.Italic],
  u: [TextStyle.Underline], ins: [TextStyle.Underline],
  s: [TextStyle.StrikeThrough], strike: [TextStyle.StrikeThrough], del: [TextStyle.StrikeThrough],
  small: [TextStyle.Small], sub: [TextStyle.Small], sup: [TextStyle.Small],
  big: [TextStyle.Big],
  mark: [TextStyle.Yellow],
  h1: [TextStyle.Bold, TextStyle.Big], h2: [TextStyle.Bold, TextStyle.Big],
  h3: [TextStyle.Bold], h4: [TextStyle.Bold], h5: [TextStyle.Bold], h6: [TextStyle.Bold],
  th: [TextStyle.Bold],
};

/** Thẻ khối: mở/đóng đều xuống dòng. */
const BLOCK_TAGS = new Set(['p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'table', 'tr', 'section', 'article', 'header', 'footer', 'figure', 'hr']);
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr']);
const DROPPED_TAGS = new Set(['script', 'style', 'head', 'title', 'noscript', 'svg', 'iframe', 'template']);

const NUMERIC_ENTITY = /&#(x?)([0-9a-fA-F]+);/g;
const NAMED_ENTITY: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”',
  lsquo: '‘', rsquo: '’', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', euro: '€',
};

function decodeEntities(value: string) {
  return value
    .replace(NUMERIC_ENTITY, (_match, hex: string, code: string) => {
      const point = Number.parseInt(code, hex ? 16 : 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,31});/g, (match, name: string) => NAMED_ENTITY[name.toLowerCase()] ?? match);
}

function parseColor(raw: string): [number, number, number] | null {
  const value = raw.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((digit) => digit + digit).join('') : hex[1];
    return [Number.parseInt(digits.slice(0, 2), 16), Number.parseInt(digits.slice(2, 4), 16), Number.parseInt(digits.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value);
  if (rgb) return [Math.round(Number(rgb[1])), Math.round(Number(rgb[2])), Math.round(Number(rgb[3]))];
  return NAMED_COLORS[value] ?? null;
}

/**
 * Màu xám/đen/trắng được coi là "không tô màu" — nếu quy về bảng 4 màu của Zalo
 * thì chữ đen dán từ Word sẽ bị biến thành chữ xanh.
 */
function nearestZaloColor(rgb: [number, number, number]): TextStyle | null {
  if (Math.max(...rgb) - Math.min(...rgb) < 40) return null;
  let best = ZALO_COLORS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of ZALO_COLORS) {
    const distance = (candidate.rgb[0] - rgb[0]) ** 2 + (candidate.rgb[1] - rgb[1]) ** 2 + (candidate.rgb[2] - rgb[2]) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
  }
  return best.st;
}

function parseAttributes(raw: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw))) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attributes;
}

/** Style suy ra từ `style="…"`, `color=`, `size=` của một thẻ bất kỳ. */
function inlineStyles(tag: string, attributes: Record<string, string>): TextStyle[] {
  const styles: TextStyle[] = [];
  const declarations = new Map<string, string>();
  for (const part of (attributes.style ?? '').split(';')) {
    const separator = part.indexOf(':');
    if (separator > 0) declarations.set(part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim().toLowerCase());
  }

  const weight = declarations.get('font-weight');
  if (weight && (weight === 'bold' || weight === 'bolder' || Number.parseInt(weight, 10) >= 600)) styles.push(TextStyle.Bold);
  if (declarations.get('font-style') === 'italic' || declarations.get('font-style') === 'oblique') styles.push(TextStyle.Italic);
  const decoration = declarations.get('text-decoration') ?? declarations.get('text-decoration-line') ?? '';
  if (decoration.includes('underline')) styles.push(TextStyle.Underline);
  if (decoration.includes('line-through')) styles.push(TextStyle.StrikeThrough);

  const color = declarations.get('color') ?? (tag === 'font' ? attributes.color : undefined);
  if (color) {
    const rgb = parseColor(color);
    const mapped = rgb ? nearestZaloColor(rgb) : null;
    if (mapped) styles.push(mapped);
  }

  const fontSize = declarations.get('font-size');
  if (fontSize) {
    const pixels = /^([\d.]+)\s*(px|pt|rem|em)?$/.exec(fontSize);
    if (pixels) {
      const amount = Number(pixels[1]);
      const unit = pixels[2] ?? 'px';
      const normalized = unit === 'pt' ? amount * (4 / 3) : unit === 'rem' || unit === 'em' ? amount * 16 : amount;
      if (normalized <= 14) styles.push(TextStyle.Small);
      else if (normalized >= 18) styles.push(TextStyle.Big);
    } else if (['x-small', 'xx-small', 'small', 'smaller'].includes(fontSize)) styles.push(TextStyle.Small);
    else if (['large', 'larger', 'x-large', 'xx-large'].includes(fontSize)) styles.push(TextStyle.Big);
  } else if (tag === 'font' && attributes.size) {
    const size = Number.parseInt(attributes.size, 10);
    if (size <= 2) styles.push(TextStyle.Small);
    else if (size >= 4) styles.push(TextStyle.Big);
  }

  return styles;
}

type OpenFrame = { tag: string; start: number; styles: TextStyle[]; indent: boolean; preserveWhitespace: boolean };

/**
 * Đổi HTML sang văn bản thuần + danh sách style của Zalo.
 * Các thẻ không nhận diện được chỉ bị bỏ đi, nội dung bên trong vẫn giữ.
 */
export function htmlToZaloMessage(html: string, maxLength = MAX_LENGTH): ZaloMessageContent {
  let text = '';
  const styles: Style[] = [];
  const open: OpenFrame[] = [];
  const listTypes: TextStyle[] = [];
  let pendingSpace = false;

  const preserving = () => open.some((frame) => frame.preserveWhitespace);
  const indentDepth = () => open.filter((frame) => frame.indent).length;

  const pushText = (raw: string) => {
    if (!raw) return;
    if (preserving()) { text += raw; pendingSpace = false; return; }
    const collapsed = raw.replace(/[\s ]+/g, ' ');
    if (!collapsed.trim()) { if (text && !text.endsWith('\n')) pendingSpace = true; return; }
    const leading = collapsed.startsWith(' ');
    const trailing = collapsed.endsWith(' ');
    if ((pendingSpace || leading) && text && !text.endsWith('\n')) text += ' ';
    text += collapsed.trim();
    pendingSpace = trailing;
  };

  const pushNewline = (force = false) => {
    pendingSpace = false;
    if (!text) return;
    if (!force && text.endsWith('\n')) return;
    if (force && text.endsWith('\n\n')) return;
    text += '\n';
  };

  /** Mỗi `li` nhận ký hiệu đầu dòng của chính Zalo thông qua style lst_1 / lst_2. */
  const openTag = (tag: string, attributes: Record<string, string>) => {
    if (BLOCK_TAGS.has(tag)) pushNewline();
    if (tag === 'ul') listTypes.push(TextStyle.UnorderedList);
    if (tag === 'ol') listTypes.push(TextStyle.OrderedList);

    const frameStyles = [...(TAG_STYLES[tag] ?? []), ...inlineStyles(tag, attributes)];
    if (tag === 'li') {
      frameStyles.push(listTypes.at(-1) ?? TextStyle.UnorderedList);
    }
    // Khoảng trắng đang chờ thuộc về phần trước thẻ, nên đẩy ra trước khi chốt `start`.
    if (pendingSpace && text && !text.endsWith('\n')) { text += ' '; pendingSpace = false; }
    const frame: OpenFrame = {
      tag,
      start: text.length,
      styles: [...new Set(frameStyles)],
      indent: tag === 'blockquote',
      preserveWhitespace: tag === 'pre',
    };
    open.push(frame);
  };

  const closeTag = (tag: string) => {
    const index = open.map((frame) => frame.tag).lastIndexOf(tag);
    if (index < 0) return;
    // Thẻ chưa đóng nằm bên trong cũng được đóng theo, tránh style tràn ra ngoài.
    for (let position = open.length - 1; position >= index; position--) {
      const frame = open[position];
      const length = text.length - frame.start;
      if (length > 0) {
        for (const st of frame.styles) styles.push({ start: frame.start, len: length, st } as Style);
        if (frame.indent) styles.push({ start: frame.start, len: length, st: TextStyle.Indent, indentSize: 4 });
      }
      open.length = position;
    }
    if ((tag === 'ul' || tag === 'ol') && listTypes.length) listTypes.pop();
    if (BLOCK_TAGS.has(tag)) pushNewline();
  };

  const source = html ?? '';
  const tokenizer = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenizer.exec(source))) {
    pushText(decodeEntities(source.slice(cursor, match.index)));
    cursor = tokenizer.lastIndex;
    if (!match[1]) continue; // comment
    const tag = match[1].toLowerCase();
    const closing = match[0].startsWith('</');
    const selfClosing = match[2].trimEnd().endsWith('/');

    if (DROPPED_TAGS.has(tag)) {
      if (!closing) {
        const end = new RegExp(`</${tag}\\s*>`, 'i').exec(source.slice(cursor));
        cursor = end ? cursor + end.index + end[0].length : source.length;
        tokenizer.lastIndex = cursor;
      }
      continue;
    }
    if (tag === 'br') { pushNewline(true); continue; }
    if (tag === 'hr') { pushNewline(); continue; }
    if (VOID_TAGS.has(tag)) continue;
    if (closing) closeTag(tag);
    else if (selfClosing) { openTag(tag, parseAttributes(match[2])); closeTag(tag); }
    else openTag(tag, parseAttributes(match[2]));
  }
  pushText(decodeEntities(source.slice(cursor)));
  while (open.length) closeTag(open.at(-1)!.tag);

  // Cắt khoảng trắng đầu/cuối rồi co các khoảng style về đúng phần còn lại.
  const leadingTrim = text.length - text.replace(/^[\s ]+/, '').length;
  const trimmed = text.replace(/^[\s ]+/, '').replace(/[\s ]+$/, '');
  const limited = trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;

  const clamped: Style[] = [];
  for (const style of styles) {
    const start = Math.max(0, style.start - leadingTrim);
    const end = Math.min(limited.length, style.start - leadingTrim + style.len);
    if (end > start) clamped.push({ ...style, start, len: end - start } as Style);
  }
  clamped.sort((left, right) => left.start - right.start || right.len - left.len);
  return { text: limited, styles: clamped };
}

/** Văn bản xem trước (không style) — dùng cho preview và đếm ký tự. */
export function htmlToPlainText(html: string, maxLength = MAX_LENGTH) {
  return htmlToZaloMessage(html, maxLength).text;
}
