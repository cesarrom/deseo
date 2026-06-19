'use client';

import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Link as LinkIcon, 
  Eye, 
  Edit3,
  Quote
} from 'lucide-react';
import { Button } from '@deseo/ui/button';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function RichEditor({ value, onChange, placeholder, label }: RichEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = 
      value.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      value.substring(end);

    onChange(newValue);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const toolbarActions = [
    { icon: Heading1, action: () => insertText('# ', ''), title: 'H1' },
    { icon: Heading2, action: () => insertText('## ', ''), title: 'H2' },
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertText('_', '_'), title: 'Italic' },
    { icon: Quote, action: () => insertText('> ', ''), title: 'Quote' },
    { icon: List, action: () => insertText('- ', ''), title: 'List' },
    { icon: ListOrdered, action: () => insertText('1. ', ''), title: 'Ordered List' },
    { icon: LinkIcon, action: () => insertText('[', '](url)'), title: 'Link' },
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        {/* Header / Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-3 py-2">
          <div className="flex bg-slate-200/50 p-1 rounded-md">
            <button
              onClick={() => setMode('write')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all",
                mode === 'write' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Edit3 className="h-3 w-3" /> Write
            </button>
            <button
              onClick={() => setMode('preview')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all",
                mode === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>

          {mode === 'write' && (
            <div className="flex items-center gap-0.5 border-l border-slate-200 ml-4 pl-4">
              {toolbarActions.map((item, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    item.action();
                  }}
                  title={item.title}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative">
          {mode === 'write' ? (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full min-h-[200px] p-4 text-sm font-mono border-none focus:ring-0 resize-y bg-transparent"
            />
          ) : (
            <div className="w-full min-h-[200px] p-4 prose prose-slate prose-sm max-w-none bg-white overflow-y-auto">
              {value ? (
                <ReactMarkdown>{value}</ReactMarkdown>
              ) : (
                <p className="text-slate-400 italic">Nothing to preview</p>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-slate-50/50 border-t border-slate-100 px-3 py-1.5 flex justify-between items-center">
           <p className="text-[10px] text-slate-400 font-medium">Markdown Supported</p>
           <p className="text-[10px] text-slate-400">{value.length} characters</p>
        </div>
      </div>
    </div>
  );
}
