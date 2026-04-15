/**
 * 市町村サービスモジュール（クライアントサイド用）
 *
 * クライアントコンポーネントから市町村APIを呼び出すためのサービス。
 *
 * 使用場所:
 * - Client Component
 *
 * 注意:
 * - Server Component や API Route では lib/server/municipality の Repository を直接使用する
 */

export { MunicipalityService, getMunicipalityService } from './MunicipalityService';
