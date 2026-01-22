import { supabase } from '../supabase/client';
import { StoreType, Priority, Store, Department } from '../types';

export interface StockIntakeParams {
    stockItemId: string;
    quantity: number;
    store: StoreType;
    location: string;
    receivedById: string;
    deliveryNote: string;
    comments: string;
    attachmentUrl: string | null;
    isReturn?: boolean;
    returnWorkflowId?: string | null;
}

export interface StockRequestItem {
    stock_item_id: string;
    quantity: number;
}

export interface CreateRequestParams {
    requesterId: string;
    requestNumber: string;
    siteId: string;
    department: Store;
    priority: Priority;
    attachmentUrl: string | null;
    items: StockRequestItem[];
    comment: string;
}

interface RPCResponse {
    success: boolean;
    error?: string;
    [key: string]: any;
}

export const stockService = {
    /**
     * Process a stock intake (receipt) atomically using a Database RPC function.
     * This prevents race conditions when updating inventory quantities.
     */
    async processStockIntake(params: StockIntakeParams) {
        const { data, error } = await (supabase.rpc as any)('process_stock_intake', {
            p_stock_item_id: params.stockItemId,
            p_quantity: params.quantity,
            p_store: params.store,
            p_location: params.location,
            p_received_by_id: params.receivedById,
            p_delivery_note: params.deliveryNote,
            p_comments: params.comments,
            p_attachment_url: params.attachmentUrl,
            p_is_return: params.isReturn || false,
            p_return_workflow_id: params.returnWorkflowId || null
        });

        if (error) throw error;

        // The RPC returns a JSON object with { success: boolean, error?: string }
        const result = data as RPCResponse;
        if (result && !result.success) {
            throw new Error(result.error || 'Stock intake failed');
        }

        return result;
    },

    /**
     * Create a new stock request atomically.
     */
    async createStockRequest(params: CreateRequestParams) {
        const { data, error } = await (supabase.rpc as any)('process_stock_request', {
            p_requester_id: params.requesterId,
            p_request_number: params.requestNumber,
            p_site_id: params.siteId,
            p_department: params.department as unknown as Department, // Cast to match DB enum if needed
            p_priority: params.priority,
            p_items: params.items,
            p_attachment_url: params.attachmentUrl,
            p_comment: params.comment
        });

        if (error) throw error;

        const result = data as RPCResponse;
        if (result && !result.success) {
            throw new Error(result.error || 'Request creation failed');
        }

        return result;
    }
};
