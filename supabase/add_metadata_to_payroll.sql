-- Add metadata column to payroll table for storing detailed breakdown
ALTER TABLE public.payroll
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
