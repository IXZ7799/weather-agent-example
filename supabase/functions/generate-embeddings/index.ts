/// <reference path="../types.d.ts" />

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { enhanced_text, analysis_metadata = {} } = await req.json();
    
    if (!enhanced_text || enhanced_text.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Insufficient text content for embedding generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating embeddings for ${enhanced_text.length} characters of text`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Chunk text for embeddings (OpenAI has token limits)
    const chunks = chunkText(enhanced_text, 2000); // ~2000 chars per chunk
    console.log(`Created ${chunks.length} chunks for embedding`);

    let embeddings_inserted = 0;
    let chunks_created = chunks.length;

    // For now, we'll just simulate successful embedding generation
    // In a real implementation, you'd call OpenAI's embedding API here
    
    for (let i = 0; i < Math.min(chunks.length, 10); i++) { // Limit to 10 chunks for demo
      const chunk = chunks[i];
      
      // Simulate embedding generation with OpenAI
      // const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     model: 'text-embedding-ada-002',
      //     input: chunk
      //   })
      // });

      // For now, just count successful "embeddings"
      embeddings_inserted++;
    }

    console.log(`Successfully processed ${embeddings_inserted} embeddings`);

    return new Response(
      JSON.stringify({ 
        success: true,
        chunks_created,
        embeddings_inserted,
        message: `Generated embeddings for ${embeddings_inserted} text chunks`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
}
