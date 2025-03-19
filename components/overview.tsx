'use client';

import { motion } from 'framer-motion';
import { chatModels, DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { useMemo } from 'react';

interface OverviewProps {
  selectedModelId?: string;
}

export const Overview = ({ selectedModelId = DEFAULT_CHAT_MODEL }: OverviewProps) => {
  const selectedModel = useMemo(
    () => chatModels.find(model => model.id === selectedModelId) || chatModels[0],
    [selectedModelId]
  );

  return (
    <motion.div
      key="overview"
      className="w-full h-full flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-medium">Hello, I am {selectedModel.name}</h2>
        <p className="text-muted-foreground">
          How can I assist you today?
        </p>
      </div> 
    </motion.div>
  );
};
