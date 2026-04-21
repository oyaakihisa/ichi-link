'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 地図コンポーネント用のError Boundary
 * Reactのレンダリングエラーをキャッチして、クラッシュ時にもエラー情報を表示
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[MapErrorBoundary] Caught error:', error);
    console.error('[MapErrorBoundary] Error info:', errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center gap-4 p-4 text-center max-w-md">
            <div className="text-red-500 text-lg font-bold">
              地図読み込みエラー [crash]
            </div>
            <div className="text-gray-700">
              地図コンポーネントでエラーが発生しました
            </div>
            <div className="text-xs text-gray-500 bg-gray-200 p-2 rounded break-all max-h-32 overflow-auto">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <div className="text-xs text-gray-400 bg-gray-200 p-2 rounded break-all max-h-24 overflow-auto">
              UA: {userAgent}
            </div>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
