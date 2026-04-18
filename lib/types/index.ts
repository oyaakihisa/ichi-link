// 座標関連
export type { Coordinate, CoordinateFormat, Datum, InputSource } from './coordinate';

// 入力関連
export type {
  InputType,
  ParsedCoordinate,
  ParsedAddress,
  LocationInput,
} from './input';

// 結果関連
export type {
  WarningType,
  WarningSeverity,
  Warning,
  MapUrls,
  ConversionResult,
} from './result';

// マップ関連
export type {
  PinLocation,
  MapState,
  MapInteractionState,
  TabType,
  Tab,
} from './map';
export { DEFAULT_MAP_STATE, TABS } from './map';

// POI関連
export type {
  POIType,
  POI,
  POIListItem,
  POIDetail,
  AEDDetail,
  FireHydrantDetail,
  LayerVisibility,
  AvailablePOITypes,
  MapBounds,
  POIQueryOptions,
} from './poi';
export { DEFAULT_LAYER_VISIBILITY } from './poi';

// 市町村関連
export type {
  Municipality,
  MunicipalityStatus,
  MunicipalityMapConfig,
  MunicipalityLayerConfig,
  MunicipalitySeoConfig,
  MunicipalityContentConfig,
  MunicipalityLayerStatus,
} from './municipality';
export { toMunicipality, toMunicipalityLayerStatus } from './municipality';

// データベース関連
export type {
  Database,
  MunicipalityRow,
  MunicipalityLayerStatusRow,
  POIRow,
} from './database';
