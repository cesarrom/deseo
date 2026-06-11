import type { ArticleAST, ContentNode } from '@deseo/types';

interface StrapiBlock {
  __component: string;
  [key: string]: unknown;
}

export function astToStrapiBlocks(ast: ArticleAST): StrapiBlock[] {
  return ast.content.map(nodeToStrapiBlock);
}

function nodeToStrapiBlock(node: ContentNode): StrapiBlock {
  switch (node.type) {
    case 'heading':
      return {
        __component: 'blocks.heading',
        level: node.level,
        text: node.text,
      };
    
    case 'paragraph':
      return {
        __component: 'blocks.rich-text',
        content: node.text,
      };
    
    case 'list':
      return {
        __component: 'blocks.list',
        ordered: node.ordered,
        items: node.items,
      };
    
    case 'image':
      return {
        __component: 'blocks.media',
        file: { url: node.url },
        caption: node.caption,
        alternativeText: node.alt,
      };
    
    case 'code':
      return {
        __component: 'blocks.code',
        language: node.language,
        code: node.code,
      };
    
    case 'blockquote':
      return {
        __component: 'blocks.quote',
        body: node.text,
        author: node.author,
      };
    
    default:
      return {
        __component: 'blocks.rich-text',
        content: '',
      };
  }
}
