import type { ArticleAST } from '@deseo/types';

/**
 * Payload CMS Native Converter
 * Since Deseo uses Lexical-compatible AST internally, and Payload CMS
 * uses Lexical as its default rich text format, this is a pass-through.
 */

export function astToPayloadBlocks(ast: any): any {
  // If it is already a full Lexical state object (has root wrapper)
  if (ast && ast.root) {
    return ast;
  }

  // If it is the workflow output shape { metadata, content }
  if (ast && Array.isArray(ast.content)) {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: ast.content,
      },
    };
  }

  // If it is already a flat array of children nodes
  if (Array.isArray(ast)) {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: ast,
      },
    };
  }

  return ast;
}

export function payloadToAst(payloadData: any): ArticleAST {
  // If we receive the full root object
  if (payloadData && payloadData.root) {
    return payloadData as ArticleAST;
  }

  // If we receive just the root node
  return {
    root: payloadData,
  };
}
