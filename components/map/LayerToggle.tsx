import mapboxgl from 'mapbox-gl';
import type { LayerVisibility, AvailablePOITypes } from '@/lib/types';

/**
 * レイヤー切替コントロール（Mapbox IControl実装）
 * AED/消火栓/防火水槽レイヤーの表示/非表示を切り替える
 * 利用可能なPOIタイプのみ表示する
 */
export class LayerToggleControl implements mapboxgl.IControl {
  private container: HTMLDivElement | null = null;
  private map: mapboxgl.Map | null = null;
  private visibility: LayerVisibility;
  private onChange: (visibility: LayerVisibility) => void;
  private availableTypes: AvailablePOITypes;

  constructor(
    initialVisibility: LayerVisibility,
    onChange: (visibility: LayerVisibility) => void,
    availableTypes: AvailablePOITypes = { aed: true, fireHydrant: true, fireCistern: true }
  ) {
    this.visibility = { ...initialVisibility };
    this.onChange = onChange;
    this.availableTypes = { ...availableTypes };
  }

  onAdd(map: mapboxgl.Map): HTMLDivElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this.container.style.cssText = `
      background: white;
      border-radius: 4px;
      box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
      padding: 8px;
      min-width: 100px;
    `;

    // AEDトグル（データが存在する場合のみ表示）
    if (this.availableTypes.aed) {
      const aedRow = this.createToggleRow(
        'AED',
        '#dc2626',
        this.visibility.aed,
        (checked) => {
          this.visibility.aed = checked;
          this.onChange({ ...this.visibility });
        }
      );
      this.container.appendChild(aedRow);
    }

    // 消火栓トグル（データが存在する場合のみ表示）
    if (this.availableTypes.fireHydrant) {
      const hydrantRow = this.createToggleRow(
        '消火栓',
        '#f59e0b',
        this.visibility.fireHydrant,
        (checked) => {
          this.visibility.fireHydrant = checked;
          this.onChange({ ...this.visibility });
        }
      );
      this.container.appendChild(hydrantRow);
    }

    // 防火水槽トグル（データが存在する場合のみ表示）
    if (this.availableTypes.fireCistern) {
      const cisternRow = this.createToggleRow(
        '防火水槽',
        '#2563eb',
        this.visibility.fireCistern,
        (checked) => {
          this.visibility.fireCistern = checked;
          this.onChange({ ...this.visibility });
        }
      );
      this.container.appendChild(cisternRow);
    }

    return this.container;
  }

  onRemove(): void {
    this.container?.parentNode?.removeChild(this.container);
    this.map = null;
  }

  /**
   * トグル行を作成
   */
  private createToggleRow(
    label: string,
    color: string,
    initialChecked: boolean,
    onToggle: (checked: boolean) => void
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      cursor: pointer;
      user-select: none;
    `;

    // カラーインジケーター（円）
    const indicator = document.createElement('span');
    indicator.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid white;
      box-shadow: 0 0 0 1px ${color};
      flex-shrink: 0;
    `;

    // チェックボックス
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialChecked;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      margin: 0;
      cursor: pointer;
      accent-color: ${color};
    `;
    checkbox.addEventListener('change', () => {
      onToggle(checkbox.checked);
      this.updateIndicatorOpacity(indicator, checkbox.checked);
    });

    // ラベル
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 13px;
      color: #333;
      white-space: nowrap;
    `;

    // インジケーターの初期透明度設定
    this.updateIndicatorOpacity(indicator, initialChecked);

    // 行クリックでトグル
    row.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        onToggle(checkbox.checked);
        this.updateIndicatorOpacity(indicator, checkbox.checked);
      }
    });

    row.appendChild(indicator);
    row.appendChild(checkbox);
    row.appendChild(labelEl);

    return row;
  }

  /**
   * インジケーターの透明度を更新
   */
  private updateIndicatorOpacity(indicator: HTMLSpanElement, visible: boolean): void {
    indicator.style.opacity = visible ? '1' : '0.3';
  }

  /**
   * 外部から表示状態を更新
   */
  updateVisibility(visibility: LayerVisibility): void {
    this.visibility = { ...visibility };
    // DOM更新は再描画時に反映される
  }

  /**
   * 利用可能なPOIタイプを更新し、UIを再構築
   */
  updateAvailableTypes(availableTypes: AvailablePOITypes): void {
    // 変更がなければ何もしない
    if (
      this.availableTypes.aed === availableTypes.aed &&
      this.availableTypes.fireHydrant === availableTypes.fireHydrant &&
      this.availableTypes.fireCistern === availableTypes.fireCistern
    ) {
      return;
    }

    this.availableTypes = { ...availableTypes };

    // コンテナが存在する場合、UIを再構築
    if (this.container && this.map) {
      // 既存の子要素をクリア
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      // トグル行を再構築
      if (this.availableTypes.aed) {
        const aedRow = this.createToggleRow(
          'AED',
          '#dc2626',
          this.visibility.aed,
          (checked) => {
            this.visibility.aed = checked;
            this.onChange({ ...this.visibility });
          }
        );
        this.container.appendChild(aedRow);
      }

      if (this.availableTypes.fireHydrant) {
        const hydrantRow = this.createToggleRow(
          '消火栓',
          '#f59e0b',
          this.visibility.fireHydrant,
          (checked) => {
            this.visibility.fireHydrant = checked;
            this.onChange({ ...this.visibility });
          }
        );
        this.container.appendChild(hydrantRow);
      }

      if (this.availableTypes.fireCistern) {
        const cisternRow = this.createToggleRow(
          '防火水槽',
          '#2563eb',
          this.visibility.fireCistern,
          (checked) => {
            this.visibility.fireCistern = checked;
            this.onChange({ ...this.visibility });
          }
        );
        this.container.appendChild(cisternRow);
      }
    }
  }
}
