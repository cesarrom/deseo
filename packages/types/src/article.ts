/**
 * Lexical-compatible Content AST
 * Based on the open-source Lexical framework (Meta)
 * Used as the universal content format for Deseo Hub.
 */

export type LexicalDirection = 'ltr' | 'rtl' | null;

export interface LexicalNode {
  type: string;
  version: number;
}

export interface LexicalTextNode extends LexicalNode {
  type: 'text';
  text: string;
  format: number; // bitwise format: 1=bold, 2=italic, 4=strikethrough, etc.
  style: string;
  detail: number;
  mode: 'normal' | 'token' | 'segmented';
}

export interface LexicalElementNode extends LexicalNode {
  children: (LexicalNode | LexicalTextNode | LexicalElementNode)[];
  direction: LexicalDirection;
  format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
  indent: number;
}

// ---------------------------------------------------------------------------
// Deseo ContentNode — the flat, typed AST used by the AI generation pipeline
// ---------------------------------------------------------------------------

export type ContentNode =
  | { type: 'heading'; id: string; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; id: string; text: string }
  | { type: 'list'; id: string; ordered: boolean; items: string[] }
  | { type: 'image'; id: string; url: string; alt: string; caption?: string }
  | { type: 'code'; id: string; language: string; code: string }
  | { type: 'blockquote'; id: string; text: string; author?: string }
  | { type: 'callout'; id: string; text: string; variant?: string }
  | { type: 'divider'; id: string };

// ---------------------------------------------------------------------------
// Article Metadata — SEO / publishing metadata attached to every article
// ---------------------------------------------------------------------------

export interface ArticleMetadata {
  title: string;
  slug: string;
  description: string;
  keywords: string[];
  heroImageUrl?: string;
}

/**
 * The Root of a Deseo Article AST.
 * Supports both the flat ContentNode[] format (used by the AI pipeline)
 * and the nested Lexical root format (used by PayloadCMS / rich-text editor).
 */
export interface ArticleAST {
  metadata: ArticleMetadata;
  content: ContentNode[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    schema?: Record<string, unknown>;
  };
  /** Optional: Lexical editor root node for CMS-native rich text */
  root?: LexicalElementNode;
}

export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
