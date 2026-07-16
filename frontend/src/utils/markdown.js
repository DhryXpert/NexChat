export function renderMarkdown(text) {
  if (!text) return '';

  const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 1. Extract code blocks
  const codeBlocks = [];
  let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = codeBlocks.length;
    codeBlocks.push({ lang: lang || 'text', code: code.trimEnd() });
    return `%%CODE_BLOCK_${id}%%`;
  });

  // 2. Process line by line
  const lines = processed.split('\n');
  const htmlLines = [];
  let inList = null;

  const closeList = () => {
    if (inList) { htmlLines.push(`</${inList}>`); inList = null; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block placeholder
    if (line.includes('%%CODE_BLOCK_')) {
      closeList();
      const match = line.match(/%%CODE_BLOCK_(\d+)%%/);
      if (match) {
        const { lang, code } = codeBlocks[parseInt(match[1])];
        const codeId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        htmlLines.push(`
<div class="code-block">
  <div class="code-block__header">
    <span class="code-block__lang">${escapeHtml(lang)}</span>
    <button class="btn-copy" data-code-id="${codeId}" onclick="(function(btn){var c=document.getElementById('${codeId}');navigator.clipboard.writeText(c.textContent).then(function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy'},2000)});})(this)">Copy</button>
  </div>
  <pre><code id="${codeId}" class="lang-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>
</div>`);
      }
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (inList !== 'ol') { closeList(); htmlLines.push('<ol>'); inList = 'ol'; }
      htmlLines.push(`<li>${inlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      if (inList !== 'ul') { closeList(); htmlLines.push('<ul>'); inList = 'ul'; }
      htmlLines.push(`<li>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h3) { closeList(); htmlLines.push(`<h3>${inlineMarkdown(h3[1])}</h3>`); continue; }
    if (h2) { closeList(); htmlLines.push(`<h2>${inlineMarkdown(h2[1])}</h2>`); continue; }
    if (h1) { closeList(); htmlLines.push(`<h1>${inlineMarkdown(h1[1])}</h1>`); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { closeList(); htmlLines.push('<hr>'); continue; }

    // Blank line
    if (!line.trim()) { closeList(); htmlLines.push('<br>'); continue; }

    closeList();
    htmlLines.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList();

  return htmlLines.join('\n');
}

function inlineMarkdown(text) {
  const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Inline code first
  const inlineCodes = [];
  let result = text.replace(/`([^`]+)`/g, (_, code) => {
    const id = inlineCodes.length;
    inlineCodes.push(escapeHtml(code));
    return `%%IC_${id}%%`;
  });

  // Bold italic, bold, italic
  result = result
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Restore inline codes
  inlineCodes.forEach((code, id) => {
    result = result.replace(`%%IC_${id}%%`, `<code>${code}</code>`);
  });

  return result;
}
