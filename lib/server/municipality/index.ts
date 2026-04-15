/**
 * 市町村関連サーバーサイドモジュール
 *
 * Repository:
 * - MunicipalityRepository: 市町村マスタの読み取り
 * - MunicipalityLayerStatusRepository: レイヤー状態の読み取り
 *
 * 使用場所:
 * - Server Component (generateStaticParams, generateMetadata)
 * - API Route
 * - sitemap.ts
 *
 * 注意:
 * - Client Component からは使用不可
 * - 更新操作は service_role を使用する別モジュールで行う
 */

export {
  MunicipalityRepository,
  getMunicipalityRepository,
} from './MunicipalityRepository';

export {
  MunicipalityLayerStatusRepository,
  getMunicipalityLayerStatusRepository,
} from './MunicipalityLayerStatusRepository';
