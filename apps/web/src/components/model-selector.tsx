'use client';

import { useModels } from '@deseo/api-client';
import { Card, CardContent } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Loader2, Search, Cpu } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@deseo/ui/input';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  imageOnly?: boolean;
}

export function ModelSelector({ value, onChange, imageOnly = false }: ModelSelectorProps) {
  const { data: models, isLoading } = useModels();
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredModels = models?.filter((m: any) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (imageOnly) {
      const modality: string = m.architecture?.modality ?? m.architecture?.output_modalities?.join(',') ?? '';
      return modality.includes('image') || m.id.includes('dall-e') || m.id.includes('flux') || m.id.includes('recraft') || m.id.includes('stable-diffusion') || m.id.includes('imagen');
    }
    return true;
  }).slice(0, 100);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search models (e.g. gpt-4, claude, llama)..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredModels?.map((model: any) => {
          const isSelected = value === model.id;
          const inputPrice = parseFloat(model.pricing.prompt) * 1000000;
          const outputPrice = parseFloat(model.pricing.completion) * 1000000;

          return (
            <Card 
              key={model.id}
              className={cn(
                "cursor-pointer transition-all border-2",
                isSelected ? "border-blue-600 bg-blue-50/30" : "border-slate-100 hover:border-slate-200"
              )}
              onClick={() => onChange(model.id)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{model.name}</span>
                      {isSelected && <Badge className="bg-blue-600 text-[9px] h-4">Active</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{model.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold text-slate-700">
                      ${inputPrice.toFixed(2)} / ${outputPrice.toFixed(2)}
                    </div>
                    <div className="text-[8px] text-slate-400 uppercase tracking-wider">Per 1M tokens</div>
                  </div>
                </div>
                
                <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {model.description}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                   <div className="flex items-center gap-1 text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Cpu className="h-3 w-3" />
                      Context: {Math.round(model.context_length / 1024)}k
                   </div>
                   {model.top_provider?.is_moderated && (
                     <Badge variant="outline" className="text-[8px] h-4 border-amber-200 text-amber-700">Moderated</Badge>
                   )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
