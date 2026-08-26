-- Enable public read and write access on the scans table
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on scans" ON public.scans;
CREATE POLICY "Allow public read access on scans" 
  ON public.scans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access on scans" ON public.scans;
CREATE POLICY "Allow public insert access on scans" 
  ON public.scans FOR INSERT WITH CHECK (true);
