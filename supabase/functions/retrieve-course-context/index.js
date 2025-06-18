// supabase/functions/retrieve-course-context/index.js
import { pipeline } from '@xenova/transformers';

// SQL function for matching (created in Supabase SQL Editor)
// CREATE OR REPLACE FUNCTION match_course_chunks (
//   query_embedding vector(384),
//   match_threshold float,
//   match_count int,
//   filter_module_id UUID DEFAULT NULL,
//   filter_metadata JSONB DEFAULT '{}'::jsonb
// )
// RETURNS TABLE (
//   id UUID,
//   text_chunk TEXT,
//   metadata JSONB,
//   similarity float
// )
// LANGUAGE sql STABLE AS $$
// SELECT
//   cme.id,
//   cme.text_chunk,
//   cme.metadata,
//   1 - (cme.embedding <=> query_embedding) AS similarity
// FROM
//   course_material_embeddings AS cme
// WHERE
//   (filter_module_id IS NULL OR cme.module_id = filter_module_id) AND
//   (filter_metadata = '{}'::jsonb OR cme.metadata @> filter_metadata) AND
//   (1 - (cme.embedding <=> query_embedding)) > match_threshold
// ORDER BY
//   similarity DESC
// LIMIT
//   match_count;
// $$;

export default async (req) => { // Using Deno standard req
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { 
      user_query, 
      module_id,         // Optional
      top_k = 5,         // Default to 5 results
      match_threshold = 0.3, // Default similarity threshold
      metadata_filters   // Optional: e.g., {"subject": "cybersecurity"}
    } = await req.json();

    if (!user_query) {
      return new Response(JSON.stringify({ error: 'Missing user_query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[retrieve-course-context] Received request.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[retrieve-course-context] SUPABASE_URL or SUPABASE_ANON_KEY not set.');
      throw new Error('Supabase environment variables not set.');
    }
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') } }
    });

    console.log('[retrieve-course-context] Initializing embedding model...');
    // Ensure this is the *exact same model* used in generate-embeddings
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[retrieve-course-context] Embedding model initialized.');

    console.log(`[retrieve-course-context] Embedding user query: "${user_query.substring(0, 50)}..."`);
    const queryEmbeddingOutput = await extractor(user_query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryEmbeddingOutput.data);
    console.log('[retrieve-course-context] User query embedded.');

    const rpcParams = {
      query_embedding: queryEmbedding,
      match_threshold: match_threshold,
      match_count: top_k
    };

    if (module_id) {
      rpcParams.filter_module_id = module_id;
    }
    if (metadata_filters && Object.keys(metadata_filters).length > 0) {
      rpcParams.filter_metadata = metadata_filters;
    } else {
      rpcParams.filter_metadata = {}; // Pass empty JSONB if no filters
    }
    
    console.log('[retrieve-course-context] Calling RPC match_course_chunks with params:', rpcParams);
    const { data: chunks, error: rpcError } = await supabaseClient.rpc('match_course_chunks', rpcParams);

    if (rpcError) {
      console.error('[retrieve-course-context] Error calling RPC:', rpcError);
      throw new Error(`Failed to retrieve context: ${rpcError.message}`);
    }

    console.log(`[retrieve-course-context] Retrieved ${chunks ? chunks.length : 0} chunks.`);

    return new Response(JSON.stringify({ relevant_chunks: chunks || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[retrieve-course-context] Error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'Failed to retrieve course context' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
