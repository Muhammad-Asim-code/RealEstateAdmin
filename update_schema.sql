-- Run this script in your Supabase SQL Editor to add the property_status and availability columns if they are not already present
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS availability text DEFAULT 'available',
ADD COLUMN IF NOT EXISTS property_status text DEFAULT 'Available';
