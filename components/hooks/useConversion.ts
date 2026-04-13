'use client';

import { useState, useCallback, useMemo } from 'react';
import { ConversionResult, InputSource } from '@/lib/types';
import { ConversionService, GeocodingError } from '@/lib/services';

export function useConversion() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = useMemo(() => new ConversionService(), []);

  const convert = useCallback(
    async (input: string, source: InputSource) => {
      setIsLoading(true);
      setError(null);

      try {
        const conversionResult = await service.convertAsync(input, source);

        if (conversionResult) {
          setResult(conversionResult);
          setError(null);
        } else {
          setResult(null);
          setError('入力形式を判定できませんでした。座標を入力してください。');
        }
      } catch (e) {
        setResult(null);
        if (e instanceof GeocodingError) {
          setError(e.message);
        } else {
          setError(
            e instanceof Error ? e.message : '変換中にエラーが発生しました'
          );
        }
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
