-- Create the agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  type TEXT NOT NULL,
  security_focus TEXT,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Authenticated users can read agents" ON public.agents;
DROP POLICY IF EXISTS "Admin users can insert agents" ON public.agents;
DROP POLICY IF EXISTS "Admin users can update agents" ON public.agents;
DROP POLICY IF EXISTS "Admin users can delete agents" ON public.agents;

-- Option 1: Strict security - Only admins can modify
-- Uncomment these policies if you have proper role-based auth set up
/*
CREATE POLICY "Authenticated users can read agents" 
  ON public.agents FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admin users can insert agents" 
  ON public.agents FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can update agents" 
  ON public.agents FOR UPDATE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can delete agents" 
  ON public.agents FOR DELETE 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');
*/

-- Option 2: Development mode - Any authenticated user can modify
-- Use these policies during development or if you don't have role-based auth
CREATE POLICY "Authenticated users can read agents" 
  ON public.agents FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert agents" 
  ON public.agents FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update agents" 
  ON public.agents FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete agents" 
  ON public.agents FOR DELETE 
  TO authenticated 
  USING (true);
