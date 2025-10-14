// FIX: Replaced placeholder content with inferred Supabase type definitions.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      en_inventory: {
        Row: {
          id: string;
          stock_item_id: string;
          store: string;
          quantity_on_hand: number;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stock_item_id: string;
          store: string;
          quantity_on_hand: number;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          stock_item_id?: string;
          store?: string;
          quantity_on_hand?: number;
          location?: string | null;
          created_at?: string;
        };
      };
      en_inspection_report_items: {
        Row: {
          id: string;
          category: string | null;
          question: string;
          requires_photo: boolean | null;
        };
        Insert: {
          id?: string;
          category?: string | null;
          question: string;
          requires_photo?: boolean | null;
        };
        Update: {
          id?: string;
          category?: string | null;
          question?: string;
          requires_photo?: boolean | null;
        };
      };
      en_inspection_report_vehicles: {
        Row: {
          id: string;
          registration_number: string;
          make: string | null;
          model: string | null;
          license_expiry: string | null;
          current_odometer: number | null;
          next_service_km: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          registration_number: string;
          make?: string | null;
          model?: string | null;
          license_expiry?: string | null;
          current_odometer?: number | null;
          next_service_km?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          registration_number?: string;
          make?: string | null;
          model?: string | null;
          license_expiry?: string | null;
          current_odometer?: number | null;
          next_service_km?: number | null;
          created_at?: string | null;
        };
      };
      en_inspection_report_drivers: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          assigned_vehicle: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          assigned_vehicle?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          assigned_vehicle?: string | null;
          created_at?: string | null;
        };
      };
      en_inspection_report_inspections: {
        Row: {
          id: string;
          driver_id: string | null;
          vehicle_id: string | null;
          inspection_date: string | null;
          odometer: number | null;
          site: string | null;
          remarks: string | null;
          overall_status: string | null;
          submitted_at: string | null;
        };
        Insert: {
          id?: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          inspection_date?: string | null;
          odometer?: number | null;
          site?: string | null;
          remarks?: string | null;
          overall_status?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          inspection_date?: string | null;
          odometer?: number | null;
          site?: string | null;
          remarks?: string | null;
          overall_status?: string | null;
          submitted_at?: string | null;
        };
      };
      en_inspection_report_responses: {
        Row: {
          id: string;
          inspection_id: string | null;
          item_id: string | null;
          condition: string | null;
          notes: string | null;
          photo_url: string | null;
          storage_bucket: string | null;
        };
        Insert: {
          id?: string;
          inspection_id?: string | null;
          item_id?: string | null;
          condition?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          storage_bucket?: string | null;
        };
        Update: {
          id?: string;
          inspection_id?: string | null;
          item_id?: string | null;
          condition?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          storage_bucket?: string | null;
        };
      };
      en_salvage_requests: {
        Row: {
          id: string;
          stock_item_id: string;
          quantity: number;
          status: string;
          notes: string | null;
          created_by_id: string;
          created_at: string;
          decision_by_id: string | null;
          decision_at: string | null;
          source_department: string | null;
        };
        Insert: {
          id?: string;
          stock_item_id: string;
          quantity: number;
          status: string;
          notes?: string | null;
          created_by_id: string;
          created_at?: string;
          decision_by_id?: string | null;
          decision_at?: string | null;
          source_department?: string | null;
        };
        Update: {
          id?: string;
          stock_item_id?: string;
          quantity?: number;
          status?: string;
          notes?: string | null;
          created_by_id?: string;
          created_at?: string;
          decision_by_id?: string | null;
          decision_at?: string | null;
          source_department?: string | null;
        };
      };
      en_sites: {
        Row: {
          id: string;
          name: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          created_at?: string;
        };
      };
      en_stock_items: {
        Row: {
          id: string;
          part_number: string;
          description: string | null;
          category: string | null;
          min_stock_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          part_number: string;
          description?: string | null;
          category?: string | null;
          min_stock_level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          part_number?: string;
          description?: string | null;
          category?: string | null;
          min_stock_level?: number;
          created_at?: string;
        };
      };
      en_stock_receipts: {
        Row: {
          id: string;
          stock_item_id: string;
          quantity_received: number;
          received_by_id: string;
          received_at: string;
          delivery_note_po: string;
          comments: string | null;
          store: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stock_item_id: string;
          quantity_received: number;
          received_by_id: string;
          received_at?: string;
          delivery_note_po: string;
          comments?: string | null;
          store: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          stock_item_id?: string;
          quantity_received?: number;
          received_by_id?: string;
          received_at?: string;
          delivery_note_po?: string;
          comments?: string | null;
          store?: string;
          created_at?: string;
        };
      };
      en_users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: string;
          sites: string[] | null;
          status: string;
          departments: string[] | null;
          created_at: string;
          password?: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role: string;
          sites?: string[] | null;
          status: string;
          departments?: string[] | null;
          created_at?: string;
          password?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: string;
          sites?: string[] | null;
          status?: string;
          departments?: string[] | null;
          created_at?: string;
          password?: string;
        };
      };
      en_workflow_comments: {
        Row: {
          id: string;
          workflow_request_id: string;
          user_id: string;
          comment_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_request_id: string;
          user_id: string;
          comment_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_request_id?: string;
          user_id?: string;
          comment_text?: string;
          created_at?: string;
        };
      };
      en_workflow_items: {
        Row: {
          id: string;
          workflow_request_id: string;
          stock_item_id: string;
          quantity_requested: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_request_id: string;
          stock_item_id: string;
          quantity_requested: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_request_id?: string;
          stock_item_id?: string;
          quantity_requested?: number;
          created_at?: string;
        };
      };
      en_workflow_requests: {
        Row: {
          id: string;
          request_number: string;
          type: string;
          requester_id: string;
          site_id: string | null;
          department: string;
          current_status: string;
          priority: string;
          created_at: string;
          attachment_url: string | null;
          rejection_comment: string | null;
        };
        Insert: {
          id?: string;
          request_number: string;
          type: string;
          requester_id: string;
          site_id?: string | null;
          department: string;
          current_status: string;
          priority: string;
          created_at?: string;
          attachment_url?: string | null;
          rejection_comment?: string | null;
        };
        Update: {
          id?: string;
          request_number?: string;
          type?: string;
          requester_id?: string;
          site_id?: string | null;
          department?: string;
          current_status?: string;
          priority?: string;
          created_at?: string;
          attachment_url?: string | null;
          rejection_comment?: string | null;
        };
      };
    };
    Views: {
      en_salvage_requests_view: {
        Row: { [key: string]: any };
      };
      en_stock_receipts_view: {
        Row: { [key: string]: any };
      };
      en_stock_view: {
        Row: { [key: string]: any };
      };
      en_workflows_view: {
        Row: { [key: string]: any };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
