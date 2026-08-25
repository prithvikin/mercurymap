import React from 'react';
import { Sparkles } from 'lucide-react';

/** The "this was generated" footnote shared by both recommendation panels. */
const AiDisclaimer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-5 pt-4 border-t border-sand-100 text-xs text-sand-400 flex items-start gap-1.5">
    <Sparkles className="h-3.5 w-3.5 mt-px flex-shrink-0" aria-hidden="true" />
    <span>{children}</span>
  </p>
);

export default AiDisclaimer;
