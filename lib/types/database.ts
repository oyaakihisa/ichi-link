/**
 * Supabase Database Types
 *
 * This file defines the TypeScript types for the Supabase database schema.
 * In production, consider generating this file using:
 * `npx supabase gen types typescript --project-id <project-id> > lib/types/database.ts`
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      municipalities: {
        Row: {
          jis_code: string;
          prefecture_slug: string;
          municipality_slug: string;
          prefecture_name_ja: string;
          municipality_name_ja: string;
          center_lat: number;
          center_lng: number;
          bbox_north: number;
          bbox_south: number;
          bbox_east: number;
          bbox_west: number;
          initial_zoom: number;
          default_layers: string[];
          available_layers: string[];
          seo_title: string | null;
          seo_description: string | null;
          seo_h1: string | null;
          content_intro_text: string | null;
          content_caution_text: string | null;
          is_public: boolean;
          is_indexed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          jis_code: string;
          prefecture_slug: string;
          municipality_slug: string;
          prefecture_name_ja: string;
          municipality_name_ja: string;
          center_lat: number;
          center_lng: number;
          bbox_north: number;
          bbox_south: number;
          bbox_east: number;
          bbox_west: number;
          initial_zoom?: number;
          default_layers?: string[];
          available_layers?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          seo_h1?: string | null;
          content_intro_text?: string | null;
          content_caution_text?: string | null;
          is_public?: boolean;
          is_indexed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          jis_code?: string;
          prefecture_slug?: string;
          municipality_slug?: string;
          prefecture_name_ja?: string;
          municipality_name_ja?: string;
          center_lat?: number;
          center_lng?: number;
          bbox_north?: number;
          bbox_south?: number;
          bbox_east?: number;
          bbox_west?: number;
          initial_zoom?: number;
          default_layers?: string[];
          available_layers?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          seo_h1?: string | null;
          content_intro_text?: string | null;
          content_caution_text?: string | null;
          is_public?: boolean;
          is_indexed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      municipality_layer_statuses: {
        Row: {
          id: number;
          municipality_jis_code: string;
          layer_type: string;
          item_count: number;
          last_imported_at: string | null;
          source_updated_at: string | null;
          is_available: boolean;
        };
        Insert: {
          id?: number;
          municipality_jis_code: string;
          layer_type: string;
          item_count?: number;
          last_imported_at?: string | null;
          source_updated_at?: string | null;
          is_available?: boolean;
        };
        Update: {
          id?: number;
          municipality_jis_code?: string;
          layer_type?: string;
          item_count?: number;
          last_imported_at?: string | null;
          source_updated_at?: string | null;
          is_available?: boolean;
        };
      };
      pois: {
        Row: {
          id: string;
          type: string;
          name: string;
          /** PostGIS geometry(Point, 4326) - stored as GeoJSON or WKT */
          location: unknown;
          address: string | null;
          detail_text: string | null;
          availability_text: string | null;
          child_pad_available: boolean | null;
          source: string | null;
          source_updated_at: string | null;
          imported_at: string;
          municipality_jis_code: string | null;
        };
        Insert: {
          id: string;
          type: string;
          name: string;
          location: unknown;
          address?: string | null;
          detail_text?: string | null;
          availability_text?: string | null;
          child_pad_available?: boolean | null;
          source?: string | null;
          source_updated_at?: string | null;
          imported_at?: string;
          municipality_jis_code?: string | null;
        };
        Update: {
          id?: string;
          type?: string;
          name?: string;
          location?: unknown;
          address?: string | null;
          detail_text?: string | null;
          availability_text?: string | null;
          child_pad_available?: boolean | null;
          source?: string | null;
          source_updated_at?: string | null;
          imported_at?: string;
          municipality_jis_code?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      /** bbox検索RPC */
      get_pois_by_bbox: {
        Args: {
          p_west: number;
          p_south: number;
          p_east: number;
          p_north: number;
          p_types: string[];
          p_limit?: number;
        };
        Returns: {
          id: string;
          type: string;
          name: string;
          latitude: number;
          longitude: number;
          address: string | null;
        }[];
      };
      /** POI詳細取得RPC */
      get_poi_detail: {
        Args: {
          p_id: string;
        };
        Returns: {
          id: string;
          type: string;
          name: string;
          latitude: number;
          longitude: number;
          address: string | null;
          detail_text: string | null;
          availability_text: string | null;
          child_pad_available: boolean | null;
          source: string | null;
          source_updated_at: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/** Helper type for municipality row */
export type MunicipalityRow = Database['public']['Tables']['municipalities']['Row'];

/** Helper type for municipality layer status row */
export type MunicipalityLayerStatusRow =
  Database['public']['Tables']['municipality_layer_statuses']['Row'];

/** Helper type for POI row */
export type POIRow = Database['public']['Tables']['pois']['Row'];
