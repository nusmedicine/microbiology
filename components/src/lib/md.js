// Tiny, safe inline markdown: escapes HTML first, then applies bold/italic/code
// and paragraph splitting. Sufficient for case body/feedback text.

export function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function mdInline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function md(s) {
  return String(s)
    .split(/\n\s*\n/)
    .map((p) => '<p>' + mdInline(p.trim().replace(/\s*\n\s*/g, ' ')) + '</p>')
    .join('');
}
