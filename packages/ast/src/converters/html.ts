import type { ArticleAST, ContentNode } from '@deseo/types';

export function astToHTML(ast: ArticleAST): string {
  const head = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(ast.seo.metaTitle)}</title>
  <meta name="description" content="${escapeHTML(ast.seo.metaDescription)}">
  ${ast.seo.ogImage ? `<meta property="og:image" content="${escapeHTML(ast.seo.ogImage)}">` : ''}
  ${ast.seo.schema ? `<script type="application/ld+json">${JSON.stringify(ast.seo.schema)}</script>` : ''}
</head>
<body>
  <article>
    <h1>${escapeHTML(ast.metadata.title)}</h1>
    <p class="description">${escapeHTML(ast.metadata.description)}</p>
`.trim();

  const body = ast.content.map(nodeToHTML).join('\n    ');

  const footer = `
  </article>
</body>
</html>
`.trim();

  return `${head}\n    ${body}\n${footer}`;
}

function nodeToHTML(node: ContentNode): string {
  switch (node.type) {
    case 'heading':
      return `<h${node.level}>${escapeHTML(node.text)}</h${node.level}>`;
    
    case 'paragraph':
      return `<p>${escapeHTML(node.text)}</p>`;
    
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const items = node.items.map(item => `<li>${escapeHTML(item)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    
    case 'image':
      return `<figure><img src="${escapeHTML(node.url)}" alt="${escapeHTML(node.alt)}">${node.caption ? `<figcaption>${escapeHTML(node.caption)}</figcaption>` : ''}</figure>`;
    
    case 'code':
      return `<pre><code class="language-${escapeHTML(node.language)}">${escapeHTML(node.code)}</code></pre>`;
    
    case 'callout':
      return `<div class="callout callout-${node.variant}"><strong>${node.variant.toUpperCase()}</strong>: ${escapeHTML(node.text)}</div>`;
    
    case 'blockquote':
      return `<blockquote>${escapeHTML(node.text)}${node.author ? `<cite>${escapeHTML(node.author)}</cite>` : ''}</blockquote>`;
    
    case 'divider':
      return '<hr>';
    
    default:
      return '';
  }
}

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
