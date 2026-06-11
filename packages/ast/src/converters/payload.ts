import type { ArticleAST, ContentNode } from '@deseo/types';

interface PayloadBlock {
  blockType: string;
  [key: string]: unknown;
}

export function astToPayloadBlocks(ast: ArticleAST): PayloadBlock[] {
  return ast.content.map(nodeToPayloadBlock);
}

function nodeToPayloadBlock(node: ContentNode): PayloadBlock {
  switch (node.type) {
    case 'heading':
      return {
        blockType: 'heading',
        level: node.level,
        text: node.text,
      };
    
    case 'paragraph':
      return {
        blockType: 'richText',
        content: [{ type: 'text', text: node.text }],
      };
    
    case 'list':
      return {
        blockType: 'list',
        ordered: node.ordered,
        items: node.items.map(text => ({ text })),
      };
    
    case 'image':
      return {
        blockType: 'image',
        url: node.url,
        alt: node.alt,
        caption: node.caption,
      };
    
    case 'code':
      return {
        blockType: 'code',
        language: node.language,
        code: node.code,
      };
    
    case 'callout':
      return {
        blockType: 'callout',
        variant: node.variant,
        content: [{ type: 'text', text: node.text }],
      };
    
    case 'blockquote':
      return {
        blockType: 'quote',
        quote: node.text,
        author: node.author,
      };
    
    case 'divider':
      return {
        blockType: 'divider',
      };
    
    default:
      return { blockType: 'unknown' };
  }
}
