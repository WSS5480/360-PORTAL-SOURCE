-- Add delete_account function for admin use.
-- Deletes an account and all related data in the correct order (children before parents).
-- Call via: SELECT private.delete_account('uuid-here');

CREATE OR REPLACE FUNCTION private.delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ids uuid[];
BEGIN
  -- Get order IDs for this account
  SELECT array_agg(id) INTO v_order_ids FROM orders WHERE account_id = p_account_id;

  -- Fulfillments (via orders)
  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM fulfillment_item_trace WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_picks WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_items WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillment_files WHERE fulfillment_id IN (SELECT id FROM fulfillments WHERE order_id = ANY(v_order_ids));
    DELETE FROM fulfillments WHERE order_id = ANY(v_order_ids);
  END IF;

  -- Order audit / status / items
  IF v_order_ids IS NOT NULL AND array_length(v_order_ids, 1) > 0 THEN
    DELETE FROM order_audit_log WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_status_events WHERE order_id = ANY(v_order_ids);
    DELETE FROM order_items WHERE order_id = ANY(v_order_ids);
  END IF;

  -- Orders
  DELETE FROM orders WHERE account_id = p_account_id;

  -- Invoices (CASCADE deletes invoice_payments, invoice_items, invoice_payment_submissions)
  DELETE FROM invoices WHERE account_id = p_account_id;

  -- IVR
  DELETE FROM ivr_email_outbox WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_files WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_insurance_verifications WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_audit_log WHERE ivr_id IN (SELECT id FROM ivr_requests WHERE account_id = p_account_id);
  DELETE FROM ivr_requests WHERE account_id = p_account_id;

  -- Documents (folder_accounts, files via folders, folders)
  DELETE FROM documents_folder_accounts WHERE account_id = p_account_id;
  DELETE FROM documents_files WHERE folder_id IN (SELECT id FROM documents_folders WHERE account_id = p_account_id);
  DELETE FROM documents_folders WHERE account_id = p_account_id;

  -- Account-related
  DELETE FROM account_invites WHERE account_id = p_account_id;
  DELETE FROM account_contacts WHERE account_id = p_account_id;
  DELETE FROM account_addresses WHERE account_id = p_account_id;
  DELETE FROM account_provider_profiles WHERE account_id = p_account_id;
  DELETE FROM account_users WHERE account_id = p_account_id;
  DELETE FROM account_pricing WHERE account_id = p_account_id;

  -- Account
  DELETE FROM accounts WHERE id = p_account_id;
END;
$$;
