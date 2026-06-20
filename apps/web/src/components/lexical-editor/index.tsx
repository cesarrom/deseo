'use client';

import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import type { EditorState } from 'lexical';
import { ImageNode } from './ImageNode';
import { ToolbarPlugin } from './ToolbarPlugin';

const EDITOR_THEME = {
  heading: {
    h1: 'text-2xl font-bold my-4 text-slate-900',
    h2: 'text-xl font-bold my-3 text-slate-900',
    h3: 'text-lg font-semibold my-2 text-slate-900',
    h4: 'text-base font-semibold my-2 text-slate-800',
  },
  paragraph: 'text-slate-700 leading-relaxed my-2',
  quote: 'border-l-4 border-slate-300 pl-4 italic my-3 text-slate-500 bg-slate-50 py-2 rounded-r',
  code: 'bg-slate-950 text-slate-100 font-mono text-sm p-4 rounded-xl my-3 block overflow-x-auto',
  list: {
    ul: 'list-disc pl-6 my-2 space-y-1 text-slate-700',
    ol: 'list-decimal pl-6 my-2 space-y-1 text-slate-700',
    listitem: 'text-slate-700',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    code: 'bg-slate-100 text-red-600 font-mono px-1 py-0.5 rounded text-sm',
    underline: 'underline',
    strikethrough: 'line-through',
  },
  link: 'text-blue-600 hover:underline cursor-pointer',
};

const NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  ImageNode,
];

interface LexicalArticleEditorProps {
  initialRoot: unknown;
  onChange: (root: unknown) => void;
  readOnly?: boolean;
}

export function LexicalArticleEditor({ initialRoot, onChange, readOnly = false }: LexicalArticleEditorProps) {
  // Lexical expects the full editor state JSON: { root: {...} }
  const editorStateJson = JSON.stringify({ root: initialRoot });

  const initialConfig = {
    namespace: 'article-editor',
    theme: EDITOR_THEME,
    nodes: NODES,
    editorState: editorStateJson,
    editable: !readOnly,
    onError: (err: Error) => console.error('[LexicalEditor]', err),
  };

  const handleChange = (state: EditorState) => {
    state.read(() => {
      const json = state.toJSON();
      onChange(json.root);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {!readOnly && <ToolbarPlugin />}
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="min-h-[400px] max-h-[600px] overflow-y-auto px-6 py-4 outline-none text-slate-700 leading-relaxed"
            />
          }
          placeholder={
            <div className="absolute top-[60px] left-6 text-slate-400 text-sm pointer-events-none select-none">
              Start writing...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
