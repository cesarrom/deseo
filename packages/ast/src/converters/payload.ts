
/**
 * Normalizes a Lexical node tree for Payload v3.
 *
 * Payload's Lexical editor validates that every element node has `direction`,
 * `format`, and `indent`. Our AI pipeline omits these (they're not needed for
 * content generation), so we add them here before sending to Payload.
 */
function normalizeNode(node: any): any {
  if (!node || typeof node !== 'object') return node;

  // Text nodes only need format (already present from generation)
  if (node.type === 'text') {
    return {
      ...node,
      format: node.format ?? 0,
      mode: node.mode ?? 'normal',
      style: node.style ?? '',
      detail: node.detail ?? 0,
    };
  }

  // Link nodes need Payload-specific fields structure
  if (node.type === 'link') {
    return {
      type: 'link',
      version: node.version ?? 3,
      direction: node.direction ?? 'ltr',
      format: node.format ?? '',
      indent: node.indent ?? 0,
      fields: {
        url: node.url || node.fields?.url || '',
        newTab: node.newTab ?? node.fields?.newTab ?? true,
        linkType: node.linkType ?? node.fields?.linkType ?? 'custom',
        rel: node.rel ?? node.fields?.rel ?? 'noreferrer noopener',
      },
      children: Array.isArray(node.children) ? node.children.map(normalizeNode) : [],
    };
  }

  // Element nodes need direction, format, indent
  const normalized: any = {
    ...node,
    direction: node.direction ?? 'ltr',
    format: node.format ?? '',
    indent: node.indent ?? 0,
  };

  // Recursively normalize children
  if (Array.isArray(node.children)) {
    normalized.children = node.children.map(normalizeNode);
  }

  return normalized;
}

function normalizeRoot(root: any): any {
  return {
    type: 'root',
    version: root.version ?? 1,
    direction: root.direction ?? 'ltr',
    format: root.format ?? '',
    indent: root.indent ?? 0,
    children: Array.isArray(root.children) ? root.children.map(normalizeNode) : [],
  };
}

/**
 * Payload CMS Native Converter.
 * Deseo uses a Lexical-compatible AST internally. This normalizes it to the
 * strict shape Payload v3 requires before sending via API.
 */
export function astToPayloadBlocks(ast: any): any {
  // Lexical state object or Deseo astContent shape { root: {...}, metadata?, seo? }
  if (ast && ast.root && typeof ast.root === 'object') {
    return { root: normalizeRoot(ast.root) };
  }

  // Flat array of children
  if (Array.isArray(ast)) {
    return {
      root: normalizeRoot({
        type: 'root',
        version: 1,
        children: ast,
      }),
    };
  }

  // Legacy { content: ContentNode[] } shape
  if (ast && Array.isArray(ast.content)) {
    return {
      root: normalizeRoot({
        type: 'root',
        version: 1,
        children: ast.content,
      }),
    };
  }

  return ast;
}

export function payloadToAst(payloadData: any): any {
  if (payloadData && payloadData.root) {
    return payloadData;
  }
  return { root: payloadData };
}
