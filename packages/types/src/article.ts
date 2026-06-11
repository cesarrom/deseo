export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';

export interface ArticleMetadata {
  title: string;
  slug: string;
  description: string;
  keywords: string[];
  author?: string;
  publishDate?: string;
}

export interface ArticleSEO {
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
  schema?: Record<string, unknown>;
}

export type ContentNodeType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'code'
  | 'callout'
  | 'blockquote'
  | 'divider';

export interface BaseContentNode {
  type: ContentNodeType;
  id: string;
}

export interface HeadingNode extends BaseContentNode {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface ParagraphNode extends BaseContentNode {
  type: 'paragraph';
  text: string;
}

export interface ListNode extends BaseContentNode {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface ImageNode extends BaseContentNode {
  type: 'image';
  url: string;
  alt: string;
  caption?: string;
}

export interface CodeNode extends BaseContentNode {
  type: 'code';
  language: string;
  code: string;
}

export interface CalloutNode extends BaseContentNode {
  type: 'callout';
  variant: 'info' | 'warning' | 'success' | 'error';
  text: string;
}

export interface BlockquoteNode extends BaseContentNode {
  type: 'blockquote';
  text: string;
  author?: string;
}

export interface DividerNode extends BaseContentNode {
  type: 'divider';
}

export type ContentNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | ImageNode
  | CodeNode
  | CalloutNode
  | BlockquoteNode
  | DividerNode;

export interface ArticleAST {
  metadata: ArticleMetadata;
  content: ContentNode[];
  seo: ArticleSEO;
}
