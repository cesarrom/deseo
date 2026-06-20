'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
  $getRoot,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { $createQuoteNode } from '@lexical/rich-text';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $getNearestNodeOfType } from '@lexical/utils';
import { $createImageNode } from './ImageNode';
import {
  Bold, Italic, Code, List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Image, CornerUpLeft, CornerUpRight, Loader2,
} from 'lucide-react';
import { UNDO_COMMAND, REDO_COMMAND } from 'lexical';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function ToolbarButton({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded text-sm transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsCode(selection.hasFormat('code'));
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
      if ($isHeadingNode(element)) {
        setBlockType(element.getTag());
      } else if ($isListNode(element)) {
        const parent = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
        setBlockType(parent?.getListType() === 'number' ? 'ol' : 'ul');
      } else {
        setBlockType(element.getType());
      }
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateToolbar);
    });
  }, [editor, updateToolbar]);

  const formatHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === tag) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === 'quote') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType === 'code') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createCodeNode());
        }
      }
    });
  };

  const insertImage = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          res(result.split(',')[1] ?? '');
        };
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${API_URL}/api/images/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mediaType: file.type }),
      });
      const { url } = await resp.json() as { url: string };

      editor.update(() => {
        const selection = $getSelection();
        const imgNode = $createImageNode(url, file.name.replace(/\.[^.]+$/, ''));
        if ($isRangeSelection(selection)) {
          selection.insertNodes([imgNode]);
        } else {
          $getRoot().append(imgNode);
        }
      });
    } catch (err) {
      console.error('[ImageUpload] Failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">
        <CornerUpLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">
        <CornerUpRight className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <ToolbarButton onClick={() => formatHeading('h1')} active={blockType === 'h1'} title="Heading 1">
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h2')} active={blockType === 'h2'} title="Heading 2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading('h3')} active={blockType === 'h3'} title="Heading 3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} active={isBold} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} active={isItalic} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} active={isCode} title="Inline Code">
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        active={blockType === 'ul'}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        active={blockType === 'ol'}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatQuote} active={blockType === 'quote'} title="Quote">
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={formatCode} active={blockType === 'code'} title="Code Block">
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert Image" disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImage(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
