'use client';

import { useState, useCallback, useMemo } from 'react';
import { ConversionResult, InputSource } from '@/lib/types';
import { ConversionService } from '@/lib/services';

export function useConversion() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = useMemo(() => new ConversionService(), []);

  const convert = useCallback(
    (input: string, source: InputSource) => {
      setIsLoading(true);
      setError(null);

      try {
        // 住所入力は現在未対応
        if (source === 'address') {
          setResult(null);
          setError('住所変換は現在準備中です。');
          setIsLoading(false);
          return;
        }

        const conversionResult = service.convert(input, source);

        if (conversionResult) {
          setResult(conversionResult);
          setError(null);
        } else {
          setResult(null);
          setError('入力形式を判定できませんでした。座標を入力してください。');
        }
      } catch (e) {
        setResult(null);
        setError(e instanceof Error ? e.message : '変換中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    error,
    isLoading,
    convert,
    clear,
  };
}
