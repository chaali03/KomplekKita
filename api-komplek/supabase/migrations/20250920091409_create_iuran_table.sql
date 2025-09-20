-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create iuran table
CREATE TABLE IF NOT EXISTS public.iuran (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    komplek_id UUID NOT NULL,
    nama TEXT NOT NULL,
    jenis TEXT NOT NULL,
    nominal NUMERIC(15, 2) NOT NULL,
    periode TEXT NOT NULL,
    tgl_jatuh_tempo DATE NOT NULL,
    keterangan TEXT,
    status TEXT NOT NULL,
    wajib BOOLEAN NOT NULL DEFAULT false,
    denda_per_hari NUMERIC(15, 2),
    max_denda NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON public.iuran
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.iuran ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" 
ON public.iuran 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.iuran 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for service role only"
ON public.iuran 
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
w
CREATE POLICY "Enable delete for service role only"
ON public.iuran 
FOR DELETE
TO service_role
USING (true);