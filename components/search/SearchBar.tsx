'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { InputSource } from '@/lib/types';

interface SearchBarProps {
  onConvert: (input: string, source: InputSource) => void;
  isLoading?: boolean;
}

const INPUT_TYPES: { value: InputSource; label: string; placeholder: string }[] = [
  { value: 'address', label: '住所', placeholder: '東京都千代田区丸の内1-1-1' },
  { value: 'wgs84', label: 'WGS84', placeholder: '35.6812, 139.7671' },
  { value: 'tokyo', label: 'Tokyo', placeholder: '35.6812, 139.7671' },
];

export function SearchBar({ onConvert, isLoading = false }: SearchBarProps) {
  const [inputType, setInputType] = useState<InputSource>('address');
  const [inputValue, setInputValue] = useState('');

  const currentType = INPUT_TYPES.find((t) => t.value === inputType) || INPUT_TYPES[0];

  const handleConvert = useCallback(() => {
    if (inputValue.trim()) {
      onConvert(inputValue.trim(), inputType);
    }
  }, [inputValue, inputType, onConvert]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // IME変換中はEnterキーでの送信をスキップ
      if (e.key === 'Enter' && !isLoading && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleConvert();
      }
    },
    [handleConvert, isLoading]
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-3">
      {/* 入力タイプ選択（常時展開） */}
      <div className="flex gap-1 mb-2" role="tablist">
        {INPUT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setInputType(type.value)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              inputType === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            role="tab"
            aria-selected={inputType === type.value}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 検索入力とボタン */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentType.placeholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white min-w-0"
          aria-label="検索入力"
        />

        {/* 変換ボタン */}
        <button
          onClick={handleConvert}
          disabled={!inputValue.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            '変換'
          )}
        </button>
      </div>
    </div>
  );
}
