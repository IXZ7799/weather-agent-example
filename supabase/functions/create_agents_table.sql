-- Function to create the agents table if it doesn't exist
CREATE OR REPLACE FUNCTION create_agents_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
    -- Create the agents table
    CREATE TABLE public.agents (
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

    -- Create policy for authenticated users
    CREATE POLICY "Authenticated users can read agents" 
      ON public.agents FOR SELECT 
      TO authenticated 
      USING (true);

    -- Create policy for admin users to insert/update/delete
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
  END IF;
END;
$$;
