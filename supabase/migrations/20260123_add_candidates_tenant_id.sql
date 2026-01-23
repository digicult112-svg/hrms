-- Simple fix: Add tenant_id to candidates table
-- Run this first before the other migrations

ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS tenant_id UUID;
