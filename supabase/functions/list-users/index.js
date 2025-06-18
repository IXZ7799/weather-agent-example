// Supabase Edge Function to list users
// This function requires service role access to retrieve all users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Handle CORS preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key (automatically available in Edge Functions)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Parse request body
    const { action } = await req.json();

    if (action !== 'list') {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get all users from auth.users
    const { data: users, error } = await supabaseClient.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Get profiles data to merge with auth users
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name');

    // Merge profile data with auth users
    const mergedUsers = users.users.map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      if (profile) {
        return {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            full_name: profile.full_name || user.user_metadata?.full_name
          }
        };
      }
      return user;
    });

    return new Response(
      JSON.stringify({ users: mergedUsers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};
