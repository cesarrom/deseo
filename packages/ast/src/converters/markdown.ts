import type { ArticleAST, ContentNode } from '@deseo/types';

export function astToMarkdown(ast: ArticleAST): string {
  const lines: string[] = [];

  lines.push(`# ${ast.metadata.title}`);
  lines.push('');
  lines.push(ast.metadata.description);
  lines.push('');

  for (const node of ast.content) {
    lines.push(nodeToMarkdown(node));
    lines.push('');
  }

  return lines.join('\n');
}

function nodeToMarkdown(node: ContentNode): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(node.level)} ${node.text}`;
    
    case 'paragraph':
      return node.text;
    
    case 'list':
      return node.items
        .map((item, i) => (node.ordered ? `${i + 1}. ${item}` : `- ${item}`))
        .join('\n');
    
    case 'image':
      return `![${node.alt}](${node.url})${node.caption ? `\n*${node.caption}*` : ''}`;
    
    case 'code':
      return `\`\`\`${node.language}\n${node.code}\n\`\`\``;
    
    case 'callout':
      return `> **${node.variant.toUpperCase()}**: ${node.text}`;
    
    case 'blockquote':
      return `> ${node.text}${node.author ? `\n> — ${node.author}` : ''}`;
    
    case 'divider':
      return '---';
    
    default:
      return '';
  }
}

export function markdownToAST(markdown: string): ArticleAST {
  const lines = markdown.split('\n');
  const content: ContentNode[] = [];
  
  let title = '';
  let description = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || '';
    
    if (!title && line.startsWith('# ')) {
      title = line.slice(2);
    } else if (title && !description && line) {
      description = line;
    }
  }

  return {
    metadata: {
      title: title || 'Untitled',
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || '',
      keywords: [],
    },
    content,
    seo: {
      metaTitle: title || 'Untitled',
      metaDescription: description || '',
    },
  };
}
