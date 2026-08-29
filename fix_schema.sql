-- Run this in your Supabase SQL Editor to ensure the checkpoints table has the correct foreign key column (site_id or location_id) and reload the schema cache.

-- Option A: If you want to use location_id:
ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

-- Option B: If you want to use site_id:
-- ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;

-- Force PostgREST schema cache reload immediately
NOTIFY pgrst, 'reload schema';
