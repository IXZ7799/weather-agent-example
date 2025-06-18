import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get all environment variables
    // Deno.env doesn't have toObject() in newer versions, manually create object from entries
    const envVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(Deno.env)) {
      if (typeof value === 'string') {
        envVars[key] = value;
      }
    }
    
    // Mask sensitive values for security
    const maskedEnvVars = Object.fromEntries(
      Object.entries(envVars).map(([key, value]) => {
        // Mask API keys and other sensitive values
        if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
          return [key, value && typeof value === 'string' && value.length > 6 ? 
            `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : 
            (value ? '[MASKED]' : null)];
        }
        return [key, value];
      })
    );
    
    // Check specifically for UNSTRACT_API_KEY
    const hasUnstractKey = !!Deno.env.get('UNSTRACT_API_KEY');
    const unstractKeyLength = Deno.env.get('UNSTRACT_API_KEY')?.length || 0;
    
    return new Response(
      JSON.stringify({ 
        envVars: maskedEnvVars,
        hasUnstractKey,
        unstractKeyLength,
        message: 'Environment variables debug information'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in env-debug function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
