'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrainCircuit } from 'lucide-react';
import { Markdown } from './markdown';

interface MessageReasoningProps {
  reasoning: string;
  isLoading?: boolean;
  className?: string;
}

export function MessageReasoning({ reasoning, isLoading = false, className }: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // If reasoning starts with the special prefix, remove it
  const cleanReasoning = reasoning?.startsWith('__REASONING__') 
    ? reasoning.substring('__REASONING__'.length) 
    : reasoning;

  return (
    <div className={cn('rounded-lg border bg-muted/50', className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/50 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {isLoading ? 'Reasoning in progress...' : 'Reasoning Chain'}
          </span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-md p-1 hover:bg-muted"
          aria-label={isExpanded ? 'Collapse reasoning' : 'Expand reasoning'}
          disabled={isLoading}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      {isExpanded && !isLoading && (
        <div className="p-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            <Markdown>{cleanReasoning}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
