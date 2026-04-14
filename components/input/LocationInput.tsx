'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { InputSource } from '@/lib/types';

interface LocationInputProps {
  onConvert: (input: string, source: InputSource) => void;
  isLoading?: boolean;
}

/**
 * 入力行コンポーネント
 */
function InputRow({
  label,
  placeholder,
  value,
  onChange,
  onConvert,
  disabled,
  isLoading,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onConvert: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  hint?: string;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // IME変換中はEnterキーでの送信をスキップ
      if (e.key === 'Enter' && !disabled && !e.nativeEvent.isComposing) {
        e.preventDefault();
        onConvert();
      }
    },
    [onConvert, disabled]
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {disabled && <span className="ml-2 text-xs text-gray-400">（準備中）</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          onClick={onConvert}
          disabled={disabled || !value.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
        >
          {isLoading ? '...' : '変換'}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function LocationInput({ onConvert, isLoading = false }: LocationInputProps) {
  const [addressInput, setAddressInput] = useState('');
  const [wgs84Input, setWgs84Input] = useState('');
  const [tokyoInput, setTokyoInput] = useState('');

  const handleConvertAddress = useCallback(() => {
    if (addressInput.trim()) {
      onConvert(addressInput.trim(), 'address');
    }
  }, [addressInput, onConvert]);

  const handleConvertWgs84 = useCallback(() => {
    if (wgs84Input.trim()) {
      onConvert(wgs84Input.trim(), 'wgs84');
    }
  }, [wgs84Input, onConvert]);

  const handleConvertTokyo = useCallback(() => {
    if (tokyoInput.trim()) {
      onConvert(tokyoInput.trim(), 'tokyo');
    }
  }, [tokyoInput, onConvert]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-gray-900">位置情報を入力</h2>

      {/* 住所入力欄 */}
      <InputRow
        label="住所"
        placeholder="東京都千代田区..."
        value={addressInput}
        onChange={setAddressInput}
        onConvert={handleConvertAddress}
        disabled={false}
        isLoading={isLoading}
        hint="例: 東京都千代田区丸の内1-1-1"
      />

      {/* WGS84座標入力欄 */}
      <InputRow
        label="世界測地系（WGS84）"
        placeholder="35.6812, 139.7671"
        value={wgs84Input}
        onChange={setWgs84Input}
        onConvert={handleConvertWgs84}
        isLoading={isLoading}
        hint="例: 35.6812, 139.7671 / 35°40'52&quot;N 139°46'2&quot;E"
      />

      {/* Tokyo Datum座標入力欄 */}
      <InputRow
        label="旧日本測地系（Tokyo Datum）"
        placeholder="35.6812, 139.7671"
        value={tokyoInput}
        onChange={setTokyoInput}
        onConvert={handleConvertTokyo}
        isLoading={isLoading}
        hint="例: 35.6812, 139.7671 / 35°40'52&quot;N 139°46'2&quot;E"
      />
    </div>
  );
}
