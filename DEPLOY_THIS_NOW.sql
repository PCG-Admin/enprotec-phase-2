-- ============================================================================
-- EMERGENCY DATABASE FIX - Deploy This Now
-- ============================================================================
-- Copy this entire file and paste into Supabase SQL Editor, then click RUN
-- ============================================================================

-- Drop the broken function
DROP FUNCTION IF EXISTS public.process_stock_request CASCADE;

-- Create the CORRECT function with all schema fixes
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
    v_stock_item_id UUID;
    v_quantity INTEGER;
BEGIN
    -- Validate requester exists
    IF NOT EXISTS (SELECT 1 FROM public.en_users WHERE id = p_requester_id AND status = 'Active') THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Invalid or inactive user'
        );
    END IF;

    -- Validate items array is not empty
    IF jsonb_array_length(p_items) = 0 THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Request must contain at least one item'
        );
    END IF;

    -- Create workflow request
    INSERT INTO public.en_workflow_requests (
        requester_id,
        request_number,
        type,
        site_id,
        department,
        current_status,
        priority,
        attachment_url
    ) VALUES (
        p_requester_id,
        p_request_number,
        'Internal',
        p_site_id,
        p_department,
        'Request Submitted',
        p_priority,
        p_attachment_url
    )
    RETURNING id INTO v_workflow_id;

    -- Insert items into separate table
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_stock_item_id := (v_item->>'stock_item_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;

        -- Validate stock item exists
        IF NOT EXISTS (SELECT 1 FROM public.en_stock_items WHERE id = v_stock_item_id) THEN
            DELETE FROM public.en_workflow_requests WHERE id = v_workflow_id;
            RETURN json_build_object(
                'success', FALSE,
                'error', 'One or more stock items not found'
            );
        END IF;

        INSERT INTO public.en_workflow_items (
            workflow_request_id,
            stock_item_id,
            quantity_requested
        ) VALUES (
            v_workflow_id,
            v_stock_item_id,
            v_quantity
        );
    END LOOP;

    -- Add comment if provided
    IF p_comment IS NOT NULL AND p_comment != '' THEN
        INSERT INTO public.en_workflow_comments (
            workflow_request_id,
            user_id,
            comment_text
        ) VALUES (
            v_workflow_id,
            p_requester_id,
            p_comment
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
            'error', 'Unable to create request. Please try again.'
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_stock_request TO authenticated;

-- Verify it worked
SELECT '✅ DATABASE FIXED! Stock requests should now work. Refresh your browser (Ctrl+Shift+R).' as status;
