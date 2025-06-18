import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'; // Keep .ts for Deno modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleChatRequest } from './chat-handler.js'; // Changed to .js

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno is a global in Supabase Edge Functions
    const DENO_ENV_GET = typeof Deno !== 'undefined' ? Deno.env.get : () => undefined;

    // Create a client with the user's auth token for regular operations
    const supabaseClient = createClient(
      DENO_ENV_GET('SUPABASE_URL') ?? '',
      DENO_ENV_GET('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          // req.headers.get('Authorization')! -> req.headers.get('Authorization')
          // The non-null assertion operator (!) is a TypeScript feature.
          headers: { Authorization: req.headers.get('Authorization') },
        },
      }
    );
    
    // Create a service role client that can bypass RLS for system settings and module content
    // This ensures all users can access the system prompt and module content regardless of their role
    const serviceRoleKey = DENO_ENV_GET('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    console.log('🔑 Creating admin client with service role key');
    
    // Create admin client with explicit service role key in the Authorization header
    const supabaseAdminClient = createClient(
      DENO_ENV_GET('SUPABASE_URL') ?? '',
      serviceRoleKey,
      { 
        global: { 
          headers: { 
            Authorization: `Bearer ${serviceRoleKey}` 
          } 
        } 
      }
    );
    
    // Verify the admin client has the correct auth header
    console.log('✅ Admin client created with service role authorization');
    console.log('🔍 Admin client will bypass RLS for module content access');

    const { messages, moduleId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    console.log('Received chat request with', messages.length, 'messages');
    if (moduleId) {
      console.log('Module ID provided:', moduleId);
      
      // Direct check for documents in the database
      console.log('🔍 Performing direct check for documents linked to this module');
      
      // Check both module_content and processed_documents tables
      // Use the admin client to ensure all users can access module content
      const [moduleContentCheck, processedDocsCheck] = await Promise.all([
        supabaseAdminClient
          .from('module_content')
          .select('count')
          .eq('module_id', moduleId)
          .single(),
          
        supabaseAdminClient
          .from('processed_documents')
          .select('count')
          .eq('course_id', moduleId)
          .single()
      ]);
      
      const hasModuleContent = !moduleContentCheck.error && moduleContentCheck.data?.count > 0;
      const hasProcessedDocs = !processedDocsCheck.error && processedDocsCheck.data?.count > 0;
      
      console.log('📊 Document check results:', { 
        hasModuleContent, 
        hasProcessedDocs,
        moduleContentCount: moduleContentCheck.data?.count || 0,
        processedDocsCount: processedDocsCheck.data?.count || 0
      });
      
      // If we have a course overview question but no documents, add a note to the user message
      const isOverviewQuestion = messages.some(msg => 
        msg.role === 'user' && 
        (msg.content.toLowerCase().includes('what is this course about') || 
         msg.content.toLowerCase().includes('what will i learn') ||
         msg.content.toLowerCase().includes('course overview')));
         
      if (isOverviewQuestion && !hasModuleContent && !hasProcessedDocs) {
        console.log('⚠️ Course overview question detected but no documents found');
        // Add a note to the last user message
        const lastUserMsgIndex = messages.findIndex(msg => msg.role === 'user');
        if (lastUserMsgIndex !== -1) {
          messages[lastUserMsgIndex].content += '\n\n[NOTE: No course materials have been uploaded yet for this module.]';
          console.log('📝 Added note to user message about missing documents');
        }
      }
    }

    // Pass both clients to the chat handler - regular client for user data and admin client for system settings
    const result = await handleChatRequest(supabaseClient, messages, moduleId, supabaseAdminClient);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}); 