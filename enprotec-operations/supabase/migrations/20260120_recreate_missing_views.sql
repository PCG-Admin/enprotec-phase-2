-- Migration: Recreate Views Dropped by CASCADE in Migration 6
-- Date: 2026-01-20
-- Description: Recreates en_stock_receipts_view and verifies en_workflows_view exists
--              These were dropped when store_type ENUM was removed in migration 6

-- ============================================================================
-- RECREATE en_stock_receipts_view
-- ============================================================================

CREATE OR REPLACE VIEW public.en_stock_receipts_view AS
SELECT
    sr.id,
    sr.stock_item_id AS "stockItemId",
    si.part_number AS "partNumber",
    si.description,
    sr.quantity_received AS "quantityReceived",
    u.name AS "receivedBy",
    sr.received_at AS "receivedAt",
    sr.delivery_note_po AS "deliveryNotePO",
    sr.comments,
    sr.attachment_url AS "attachmentUrl"
FROM public.en_stock_receipts sr
JOIN public.en_stock_items si ON sr.stock_item_id = si.id
JOIN public.en_users u ON sr.received_by_id = u.id;

-- ============================================================================
-- VERIFY en_workflows_view EXISTS (should have been recreated in migration 4)
-- ============================================================================

-- If en_workflows_view doesn't exist, recreate it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'en_workflows_view'
    ) THEN
        CREATE OR REPLACE VIEW public.en_workflows_view AS
        SELECT
            wr.id,
            wr.request_number AS "requestNumber",
            wr.type,
            u.name AS requester,
            wr.requester_id,
            s.name AS "projectCode",
            wr.department,
            wr.current_status AS "currentStatus",
            wr.priority,
            wr.created_at AS "createdAt",
            wr.attachment_url AS "attachmentUrl",
            wr.rejection_comment AS "rejectionComment",
            (
                SELECT COALESCE(jsonb_agg(items_data.item_object), '[]'::jsonb)
                FROM (
                    SELECT
                        jsonb_build_object(
                            'partNumber', si.part_number,
                            'description', si.description,
                            'quantityRequested', wi.quantity_requested,
                            'quantityOnHand', COALESCE(inv.quantity_on_hand, 0)
                        ) AS item_object
                    FROM
                        public.en_workflow_items wi
                    JOIN
                        public.en_stock_items si ON wi.stock_item_id = si.id
                    LEFT JOIN
                        public.en_inventory inv ON wi.stock_item_id = inv.stock_item_id
                        AND inv.store = wr.department
                    WHERE
                        wi.workflow_request_id = wr.id
                    ORDER BY
                        si.part_number
                ) AS items_data
            ) AS items,
            ARRAY[
                'Request Submitted',
                'Awaiting Equip. Manager',
                'Awaiting Picking',
                'Picked & Loaded',
                'Dispatched',
                'EPOD Confirmed',
                'Completed'
            ]::public.workflow_status[] as steps,
            wr.driver_name AS "driverName",
            wr.vehicle_registration AS "vehicleRegistration",
            (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', wa.id,
                            'url', wa.attachment_url,
                            'fileName', wa.file_name,
                            'uploadedAt', wa.uploaded_at
                        )
                    ),
                    '[]'::jsonb
                )
                FROM public.en_workflow_attachments wa
                WHERE wa.workflow_request_id = wr.id
            ) AS attachments
        FROM public.en_workflow_requests wr
        JOIN public.en_users u ON wr.requester_id = u.id
        LEFT JOIN public.en_sites s ON wr.site_id = s.id;
    END IF;
END $$;

-- ============================================================================
-- VERIFY en_salvage_requests_view EXISTS
-- ============================================================================

-- If en_salvage_requests_view doesn't exist, recreate it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'en_salvage_requests_view'
    ) THEN
        CREATE OR REPLACE VIEW public.en_salvage_requests_view AS
        SELECT
            sr.id,
            sr.stock_item_id,
            si.part_number AS "partNumber",
            si.description,
            sr.quantity,
            sr.status,
            sr.notes,
            sr.source_department AS "sourceStore",
            sr.photo_url AS "photoUrl",
            creator.name AS "createdBy",
            sr.created_at AS "createdAt",
            decider.name AS "decisionBy",
            sr.decision_at AS "decisionAt"
        FROM public.en_salvage_requests sr
        JOIN public.en_stock_items si ON sr.stock_item_id = si.id
        JOIN public.en_users creator ON sr.created_by_id = creator.id
        LEFT JOIN public.en_users decider ON sr.decision_by_id = decider.id;
    END IF;
END $$;

-- ============================================================================
-- VERIFY en_stock_view EXISTS
-- ============================================================================

-- If en_stock_view doesn't exist, recreate it (should exist from migration 6)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name = 'en_stock_view'
    ) THEN
        CREATE OR REPLACE VIEW public.en_stock_view AS
        SELECT
            si.id,
            si.part_number AS "partNumber",
            si.description,
            si.category,
            COALESCE(inv.quantity_on_hand, 0) AS "quantityOnHand",
            si.min_stock_level AS "minStockLevel",
            inv.store,
            COALESCE(inv.location, 'N/A') AS location,
            inv.site_id
        FROM public.en_stock_items si
        LEFT JOIN public.en_inventory inv ON si.id = inv.stock_item_id;
    END IF;
END $$;

-- Add comments
COMMENT ON VIEW public.en_stock_receipts_view IS 'View for stock receipts with joined user and stock item data';
COMMENT ON VIEW public.en_workflows_view IS 'Comprehensive workflow view with items, attachments, and user data';
COMMENT ON VIEW public.en_salvage_requests_view IS 'Salvage requests with stock item and user data';
COMMENT ON VIEW public.en_stock_view IS 'Stock inventory view with items and quantities per store';
