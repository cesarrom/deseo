import type { ArticleAST, ContentNode } from '@deseo/types';

interface GutenbergBlock {
  blockName: string;
  attrs: Record<string, unknown>;
  innerBlocks?: GutenbergBlock[];
  innerHTML?: string;
}

export function astToWordPressGutenberg(ast: ArticleAST): GutenbergBlock[] {
  return ast.content.map(nodeToGutenbergBlock);
}

function nodeToGutenbergBlock(node: ContentNode): GutenbergBlock {
  switch (node.type) {
    case 'heading':
      return {
        blockName: 'core/heading',
        attrs: { level: node.level },
        innerHTML: node.text,
      };
    
    case 'paragraph':
      return {
        blockName: 'core/paragraph',
        attrs: {},
        innerHTML: node.text,
      };
    
    case 'list':
      return {
        blockName: node.ordered ? 'core/list' : 'core/list',
        attrs: { ordered: node.ordered },
        innerHTML: node.items.map(item => `<li>${item}</li>`).join(''),
      };
    
    case 'image':
      return {
        blockName: 'core/image',
        attrs: {
          url: node.url,
          alt: node.alt,
          caption: node.caption,
        },
      };
    
    case 'code':
      return {
        blockName: 'core/code',
        attrs: {},
        innerHTML: node.code,
      };
    
    case 'blockquote':
      return {
        blockName: 'core/quote',
        attrs: {},
        innerHTML: `<p>${node.text}</p>${node.author ? `<cite>${node.author}</cite>` : ''}`,
      };
    
    default:
      return {
        blockName: 'core/paragraph',
        attrs: {},
        innerHTML: '',
      };
  }
}
