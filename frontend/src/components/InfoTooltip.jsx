import React from 'react';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text }) {
  return (
    <span className="group relative inline-flex items-center justify-center ml-1 align-middle cursor-help">
      <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 transition-colors" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-max max-w-xs group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 z-50 text-center shadow-lg pointer-events-none">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
}
