'use client';

import { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'コピー', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('コピーに失敗しました');
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1 text-sm rounded transition-colors ${
        copied
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
      } ${className}`}
      aria-label={`${text}をコピー`}
    >
      {copied ? 'コピーしました' : label}
    </button>
  );
}
