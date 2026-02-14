"use client";

import { motion } from "framer-motion";

interface FeatureHighlightProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

export default function FeatureHighlight({ icon: Icon, title, description }: FeatureHighlightProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-[var(--primary)]/10 p-2">
        <Icon className="size-4 text-[var(--primary)]" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </motion.div>
  );
}
