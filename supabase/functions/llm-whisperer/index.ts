import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`LLM Whisperer request from user: ${user.email}`);

    // Get the LLM Whisperer API key from environment
    const apiKey = Deno.env.get('UNSTRACT_API_KEY');
    if (!apiKey) {
      console.error('UNSTRACT_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ 
          error: 'LLM Whisperer API key not configured',
          retriable: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { fileData, fileName, options = {} } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileData or fileName' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing file: ${fileName} for user: ${user.email}`);

    // Prepare request to LLM Whisperer API
    const llmWhispererUrl = 'https://llmwhisperer-api.unstract.com/v1/whisper';
    
    const requestBody = {
      file_data: fileData,
      file_name: fileName,
      output_mode: options.outputMode || 'layout_preserving',
      processing_mode: options.processingMode || 'ocr',
      force_text_processing: true,
      pages_to_extract: options.pages || 'all',
      timeout: options.timeout || 200,
      line_splitter_tolerance: options.lineSplitterTolerance || 0.4,
      horizontal_stretch_factor: options.horizontalStretchFactor || 1.0,
      mark_vertical_lines: true,
      mark_horizontal_lines: true,
      page_separator: options.pageSeparator || '\\n\\n---PAGE_BREAK---\\n\\n'
    };

    console.log('Sending request to LLM Whisperer API...');

    // Call LLM Whisperer API
    const response = await fetch(llmWhispererUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LLM Whisperer API error (${response.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `LLM Whisperer API error: ${response.status} ${response.statusText}`,
          details: errorText,
          retriable: response.status >= 500
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await response.json();
    console.log(`Successfully processed file: ${fileName}`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in llm-whisperer function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        retriable: true
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
