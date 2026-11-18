-- Add INTERNAL_ADMIN and IVR_STAFF to account_user_role enum for invite flow
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Run once; if values already exist, you'll get "already exists" errors (safe to ignore)

ALTER TYPE account_user_role ADD VALUE IF NOT EXISTS 'INTERNAL_ADMIN';
ALTER TYPE account_user_role ADD VALUE IF NOT EXISTS 'IVR_STAFF';
