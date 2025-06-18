// Supabase Edge Function to update user roles
// This function requires service role access to update user roles

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
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Check if user already has a role
    const { data: existingRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('id, role')
      .eq('user_id', userId);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: 'Error checking existing roles' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    let result;
    
    if (!existingRoles || existingRoles.length === 0) {
      // No existing role, create one
      result = await supabaseClient
        .from('user_roles')
        .insert({ user_id: userId, role: role })
        .select();
    } else {
      // Update existing roles
      const updates = existingRoles.map(async (roleRecord) => {
        return supabaseClient
          .from('user_roles')
          .update({ role: role })
          .eq('id', roleRecord.id);
      });
      
      await Promise.all(updates);
      
      result = { data: { role }, error: null };
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
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
