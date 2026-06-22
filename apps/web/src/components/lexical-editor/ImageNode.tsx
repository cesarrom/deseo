'use client';

import React, { Suspense } from 'react';
import {
  type DOMConversionMap,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  DecoratorNode,
} from 'lexical';

export type SerializedImageNode = Spread<
  { src: string; altText: string; caption?: string; maxWidth?: number },
  SerializedLexicalNode
>;

function ImageComponent({ src, altText, caption }: { src: string; altText: string; caption?: string }) {
  return (
    <figure className="my-6">
      <img src={src} alt={altText} className="w-full rounded-xl object-cover max-h-[480px]" />
      {caption && (
        <figcaption className="text-xs text-slate-400 text-center mt-2">{caption}</figcaption>
      )}
    </figure>
  );
}

export class ImageNode extends DecoratorNode<React.ReactNode> {
  __src: string;
  __altText: string;
  __caption: string;
  __maxWidth: number;

  static getType(): string { return 'image'; }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__caption, node.__maxWidth, node.__key);
  }

  static importJSON(data: any): ImageNode {
    const src = data.src || data.url || '';
    const altText = data.altText || data.alt || '';
    return $createImageNode(src, altText, data.caption ?? '', data.maxWidth ?? 1200);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: (el) => {
          const src = (el as HTMLImageElement).src;
          const alt = (el as HTMLImageElement).alt || '';
          return { node: $createImageNode(src, alt) };
        },
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText: string, caption = '', maxWidth = 1200, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__caption = caption;
    this.__maxWidth = maxWidth;
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
      caption: this.__caption,
      maxWidth: this.__maxWidth,
    };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'block';
    return span;
  }

  updateDOM(): false { return false; }

  decorate(): React.ReactNode {
    return (
      <Suspense fallback={null}>
        <ImageComponent src={this.__src} altText={this.__altText} caption={this.__caption} />
      </Suspense>
    );
  }
}

export function $createImageNode(src: string, altText = '', caption = '', maxWidth = 1200): ImageNode {
  return new ImageNode(src, altText, caption, maxWidth);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}
