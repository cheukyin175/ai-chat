'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { Markdown } from './markdown';

interface MessageReasoningProps {
  reasoning: string | null | undefined;
  isLoading?: boolean;
  className?: string;
  autoExpand?: boolean; // Auto-expand when streaming
  isStreaming?: boolean; // Indicate if reasoning is currently streaming
}

export function MessageReasoning({ 
  reasoning, 
  isLoading = false, 
  className,
  autoExpand = false,
  isStreaming = false
}: MessageReasoningProps) {
  // Always expanded when streaming, otherwise respect autoExpand
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  
  // Force expansion when streaming starts - only run when isStreaming changes
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Check if reasoning exists and is not empty
  const hasReasoning = !!reasoning && reasoning.trim().length > 0;
  
  // If reasoning starts with the special prefix, remove it
  const cleanReasoning = reasoning && typeof reasoning === 'string' && reasoning.startsWith('__REASONING__') 
    ? reasoning.substring('__REASONING__'.length) 
    : reasoning;

  return (
    <div className={cn('border-l', className)}>
      <div className="sticky top-0 z-10 flex items-center px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-small">
            {isStreaming || isLoading ? 'Thinking...' : 'Reasoning Chain'}
          </span>
          {(isLoading || isStreaming) && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-md p-1 hover:bg-muted ml-auto"
          aria-label={isExpanded ? 'Collapse reasoning' : 'Expand reasoning'}
          disabled={isLoading || !hasReasoning || isStreaming} // Disable when streaming
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      {isExpanded && (isStreaming || !isLoading) && hasReasoning && (
        <div className="p-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            <Markdown>{cleanReasoning || ''}</Markdown>
          </div>
        </div>
      )}
      {isExpanded && isStreaming && !hasReasoning && (
        <div className="p-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            <span className="inline-block w-4 h-4 bg-primary/10 rounded-full animate-pulse mr-1"></span>
            <span className="inline-block w-4 h-4 bg-primary/10 rounded-full animate-pulse mx-1 delay-75"></span>
            <span className="inline-block w-4 h-4 bg-primary/10 rounded-full animate-pulse mx-1 delay-150"></span>
          </div>
        </div>
      )}
      {isExpanded && !isStreaming && !isLoading && !hasReasoning && (
        <div className="p-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            No reasoning available for this message.
          </div>
        </div>
      )}
    </div>
  );
}
