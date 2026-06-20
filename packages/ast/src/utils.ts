import type { ContentNode } from '@deseo/types';
import { randomUUID } from 'crypto';

export function generateNodeId(): string {
  return randomUUID();
}

export function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string): ContentNode {
  return {
    type: 'heading',
    id: generateNodeId(),
    level,
    text,
  };
}

export function createParagraph(text: string): ContentNode {
  return {
    type: 'paragraph',
    id: generateNodeId(),
    text,
  };
}

export function createList(items: string[], ordered = false): ContentNode {
  return {
    type: 'list',
    id: generateNodeId(),
    ordered,
    items,
  };
}

export function createImage(url: string, alt: string, caption?: string): ContentNode {
  return {
    type: 'image',
    id: generateNodeId(),
    url,
    alt,
    caption,
  };
}

export function createCode(language: string, code: string): ContentNode {
  return {
    type: 'code',
    id: generateNodeId(),
    language,
    code,
  };
}
