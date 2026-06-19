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

/**
 * The Root of a Lexical Content Tree
 */
export interface ArticleAST {
  root: LexicalElementNode;
}

export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
