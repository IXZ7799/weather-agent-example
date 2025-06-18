
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client to verify the user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { request } = await req.json();

    console.log('Received scaffolding request:', request);

    // Check if OpenAI API key is configured
    if (!openaiApiKey) {
      console.error('OpenAI API key is not configured.');
      throw new Error('OpenAI API integration is not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Format the prompt for the scaffolding agent
    const prompt = `
Please generate a scaffold for a new ${request.componentType} named "${request.name}".

Description: ${request.description}
${request.securityFocus ? `Security focus: ${request.securityFocus}` : ''}
${request.additionalContext ? `Additional context: ${request.additionalContext}` : ''}

Please provide:
1. The complete code for the ${request.componentType}
2. The recommended file path
3. Brief guidance on how to integrate this into the existing application

Focus on security best practices and educational patterns that align with the teaching methodology of the InfoSec AI Buddy application.
    `;

    // Use the scaffolding agent instructions
    const scaffoldingInstructions = `You are a specialized scaffolding agent for the InfoSec AI Buddy application.

Your role is to help generate code templates and structures for information security related components with a focus on:

1. Security best practices (input validation, output encoding, authentication checks)
2. Modern React patterns with JavaScript
3. Clean, well-documented code with security considerations explicitly commented
4. Defensive coding techniques to prevent common vulnerabilities
5. Integration with the existing InfoSec AI Buddy application architecture

When generating code, include:
- Proper JavaScript patterns
- Security-focused comments explaining why certain approaches were taken
- Error handling that doesn't expose sensitive information
- Input validation where appropriate
- Clear file structure recommendations

Your output should be production-ready, security-focused code that can be directly used in the application.

Format your response with:
1. Complete code for the requested component
2. Recommended file path
3. Brief integration guidance`;

    console.log('Processing scaffolding request with Mastra-style agent');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: scaffoldingInstructions
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const scaffoldResponse = openaiData.choices[0]?.message?.content;
    
    if (!scaffoldResponse) {
      console.error('No response content from OpenAI:', openaiData);
      throw new Error('No response content received from OpenAI');
    }

    console.log('Successfully processed scaffolding request with Mastra agent');

    return new Response(JSON.stringify({ response: scaffoldResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in mastra-scaffold function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
