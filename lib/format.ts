import type { Blessing } from './blessings';

/**
 * Display-time typography: curly quotes, real dashes. The source text in
 * blessings.ts stays plain ASCII so it is easy to edit.
 */
export function typeset(text: string): string {
  return text
    .replace(/\s+-\s+/g, '—') // " - " → em dash
    .replace(/(\d)-(\d)/g, '$1–$2') // verse ranges → en dash
    .replace(/(^|[\s(—])'/g, '$1‘') // opening single quote
    .replace(/'/g, '’'); // closing quote / apostrophe
}

/**
 * Split typeset text into sentences without breaking inside quotations,
 * e.g. ‘I knew You would keep Your promises! I am so glad I trusted You!’
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let inQuote = false;
  let start = 0;

  const flush = (end: number) => {
    const s = text.slice(start, end).trim();
    if (s) out.push(s);
    start = end;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    const atBreak = next === undefined || /\s/.test(next);

    if (ch === '‘') {
      inQuote = true;
    } else if (ch === '’' && inQuote && !/[A-Za-z]/.test(next ?? '')) {
      inQuote = false;
      if (/[.!?]/.test(text[i - 1]) && atBreak) flush(i + 1);
    } else if (/[.!?]/.test(ch) && !inQuote && atBreak) {
      flush(i + 1);
    }
  }
  flush(text.length);
  return out;
}

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

/** Sort key from the first reference: canonical book order, then chapter, then verse. */
function canonKey(scripture: string): [number, number, number] {
  const first = scripture.split(',')[0].trim();
  const m = first.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!m) return [999, 0, 0];
  const book = m[1].replace(/^Psalms$/, 'Psalm');
  const idx = BOOKS.indexOf(book);
  return [idx === -1 ? 999 : idx, Number(m[2]), Number(m[3] ?? 0)];
}

export function sortCanonically(list: Blessing[]): Blessing[] {
  return [...list].sort((a, b) => {
    const ka = canonKey(a.scripture);
    const kb = canonKey(b.scripture);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}
