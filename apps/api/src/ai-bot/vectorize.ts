const VECTOR_DIM = 256;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length > 1);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Hashing-trick embedding: băm từng từ vào 1 trong 256 chiều với dấu +/- ngẫu nhiên
 * (giảm sai lệch do đụng hash) rồi chuẩn hoá về vector đơn vị. Không gọi API, không
 * cần từ điển chung giữa các tài liệu — chạy được với mọi provider AI.
 */
export function embedText(text: string): number[] {
  const vector = new Array(VECTOR_DIM).fill(0);
  const counts = new Map<number, number>();
  const signs = new Map<number, number>();
  for (const token of tokenize(text)) {
    const h = hashToken(token);
    const index = h % VECTOR_DIM;
    counts.set(index, (counts.get(index) ?? 0) + 1);
    if (!signs.has(index)) signs.set(index, (h & 0x10000) === 0 ? 1 : -1);
  }
  for (const [index, count] of counts) {
    vector[index] = signs.get(index)! * Math.log1p(count);
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) vector[i] /= norm;
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_SIZE) {
      flush();
      for (let i = 0; i < paragraph.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(paragraph.slice(i, i + CHUNK_SIZE));
      }
      continue;
    }
    if (current && current.length + paragraph.length + 2 > CHUNK_SIZE) {
      flush();
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  flush();
  return chunks;
}
