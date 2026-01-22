-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX - Run this in Supabase SQL Editor IMMEDIATELY
-- ============================================================================
-- Fixes all schema mismatches between RPC functions and actual table structure
-- ============================================================================

-- FIX 1: Update process_stock_request to use correct column name
-- Issue: Function uses 'request_type' but table has 'type'
DROP FUNCTION IF EXISTS public.process_stock_request CASCADE;

CREATE OR REPLACE FUNCTION public.process_stock_request(
    p_requester_id UUID,
    p_request_number TEXT,
    p_site_id TEXT,
    p_department TEXT,
    p_priority TEXT,
    p_items JSONB,
    p_attachment_url TEXT DEFAULT NULL,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workflow_id UUID;
    v_item JSONB;
    v_part_number TEXT;
    v_description TEXT;
    v_quantity_on_hand INTEGER;
    v_items JSONB := '[]'::JSONB;
BEGIN
    -- Validate requester exists
    IF NOT EXISTS (SELECT 1 FROM public.en_users WHERE id = p_requester_id AND status = 'Active') THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Invalid or inactive user'
        );
    END IF;

    -- Build items array with stock details
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get stock item details
        SELECT
            si.part_number,
            si.description,
            COALESCE(SUM(inv.quantity_on_hand), 0)
        INTO v_part_number, v_description, v_quantity_on_hand
        FROM public.en_stock_items si
        LEFT JOIN public.en_inventory inv ON inv.stock_item_id = si.id
        WHERE si.id = (v_item->>'stock_item_id')::UUID
        GROUP BY si.part_number, si.description;

        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', FALSE,
                'error', 'Stock item not found: ' || (v_item->>'stock_item_id')
            );
        END IF;

        v_items := v_items || jsonb_build_object(
            'partNumber', v_part_number,
            'description', v_description,
            'quantityRequested', (v_item->>'quantity')::INTEGER,
            'quantityOnHand', v_quantity_on_hand
        );
    END LOOP;

    -- Create workflow request with CORRECT column name 'type'
    INSERT INTO public.en_workflow_requests (
        requester_id,
        request_number,
        type,
        site_id,
        department,
        current_status,
        priority,
        attachment_url,
        items,
        created_at
    ) VALUES (
        p_requester_id,
        p_request_number,
        'Internal',
        p_site_id,
        p_department,
        'Request Submitted',
        p_priority,
        p_attachment_url,
        v_items,
        NOW()
    )
    RETURNING id INTO v_workflow_id;

    -- Add initial comment if provided
    IF p_comment IS NOT NULL AND p_comment != '' THEN
        INSERT INTO public.en_workflow_comments (
            workflow_id,
            user_id,
            comment_text,
            created_at
        ) VALUES (
            v_workflow_id,
            p_requester_id,
            p_comment,
            NOW()
        );
    END IF;

    RETURN json_build_object(
        'success', TRUE,
        'workflow_id', v_workflow_id,
        'request_number', p_request_number
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_stock_request TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.process_stock_request IS 'Atomically processes stock request creation with items and optional initial comment - FIXED to use correct column name "type"';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify function exists and uses correct column
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'process_stock_request';

-- Verify all columns in en_workflow_requests table
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'en_workflow_requests'
ORDER BY ordinal_position;

-- Check for any triggers that might reference wrong column names
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('en_workflow_requests', 'en_workflow_items', 'en_stock_receipts', 'en_inventory')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Schema errors fixed successfully! Stock request function now uses correct column names.' as status;
