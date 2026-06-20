import type { ArticleAST, LexicalNode, LexicalElementNode, LexicalTextNode } from '@deseo/types';

/**
 * WordPress Gutenberg to Lexical Converter
 */

export function wordPressToLexical(wpPost: any): ArticleAST {
  // If it's Gutenberg JSON blocks (from wp-json/wp/v2/posts?context=edit)
  if (Array.isArray(wpPost.blocks)) {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: wpPost.blocks.map(wpBlockToLexical).filter(Boolean) as LexicalNode[],
      }
    };
  }

  // Fallback: Simplistic HTML to Lexical (for classic editor or raw content)
  const text = wpPost.content?.rendered?.replace(/<[^>]*>?/gm, '') || '';
  return createSimpleLexicalRoot(text);
}

function wpBlockToLexical(block: any): LexicalNode | null {
  switch (block.blockName) {
    case 'core/paragraph':
      return createParagraph(block.innerHTML?.replace(/<[^>]*>?/gm, '') || '');
    
    case 'core/heading':
      return {
        type: 'heading',
        tag: `h${block.attrs?.level || 2}`,
        level: block.attrs?.level || 2,
        version: 1,
        children: [createTextNode(block.innerHTML?.replace(/<[^>]*>?/gm, '') || '')],
        direction: 'ltr',
        format: '',
        indent: 0,
      } as any;

    case 'core/image':
      return {
        type: 'image',
        url: block.attrs?.url || '',
        altText: block.attrs?.alt || '',
        version: 1,
      } as any;

    default:
      return null;
  }
}

// Helpers
function createTextNode(text: string): LexicalTextNode {
  return {
    type: 'text',
    version: 1,
    text,
    format: 0,
    style: '',
    detail: 0,
    mode: 'normal',
  };
}

function createParagraph(text: string): LexicalElementNode {
  return {
    type: 'paragraph',
    version: 1,
    children: [createTextNode(text)],
    direction: 'ltr',
    format: '',
    indent: 0,
  };
}

function createSimpleLexicalRoot(text: string): ArticleAST {
  return {
    root: {
      type: 'root',
      version: 1,
      children: [createParagraph(text)],
      direction: 'ltr',
      format: '',
      indent: 0,
    }
  };
}
