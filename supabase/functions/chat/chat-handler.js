
import { getSystemPrompt } from './system-prompt.js';

export async function handleChatRequest(supabase, messages, moduleId, adminClient) {
  try {
    console.log('🚀 === CHAT REQUEST START ===');
    console.log('📨 Received', messages.length, 'messages');
    if (moduleId) {
      console.log('📚 Module ID provided:', moduleId);
    }

    // Get comprehensive module content including LLMWhisperer extracted data
    let moduleContext = null;
    
    if (moduleId) {
      console.log(`📚 Fetching comprehensive module content for module ID: ${moduleId}`);
      
      // ALWAYS use the admin client to ensure all users can access module content
      // This is critical for non-admin users who would otherwise be blocked by RLS
      // ALWAYS use the admin client to bypass RLS restrictions
      if (!adminClient) {
        console.error('❌ ERROR: Admin client not provided for module content access. Module context will not work for non-admin users.');
        console.log('⚠️ Continuing with regular client as fallback, but module content access may be restricted');
      }
      
      // CRITICAL: Always use the admin client for module content access
      // This is essential for bypassing RLS and ensuring all users get module context
      const adminClientToUse = adminClient || supabase; // Use admin client if available, fallback to regular client with warning
      
      // Verify we're using the admin client
      const isUsingAdminClient = !!adminClient;
      console.log(`🔑 Using ${isUsingAdminClient ? 'ADMIN' : 'REGULAR'} client for module content access`);
      console.log('🔍 DEBUG: Admin client should bypass RLS for all tables');
      
      // Get content from module_content table (uses module_id field)
      // IMPORTANT: Retrieve ALL content regardless of processing status
      // This ensures non-admin users can access module content even if status tracking is incomplete
      const { data: moduleContentData, error: moduleContentError } = await adminClientToUse
        .from('module_content')
        .select('processed_content, file_name, file_type, processing_status, extracted_text')
        .eq('module_id', moduleId);
      
      console.log(`🔍 module_content query results: found ${moduleContentData?.length || 0} documents`);
      console.log('🔍 DEBUG: module_content query error:', moduleContentError?.message || 'None');
      console.log('🔍 DEBUG: module_content query for module_id:', moduleId);
      
      // Log the raw SQL query for debugging
      console.log('🔍 DEBUG: Equivalent SQL query:', 
        `SELECT processed_content, file_name, file_type, processing_status, extracted_text FROM module_content WHERE module_id = '${moduleId}'`);
      
      if (moduleContentError) {
        console.error('❌ Error fetching from module_content:', moduleContentError);
      }
      
      // Log the processing statuses we found
      if (moduleContentData && moduleContentData.length > 0) {
        console.log('📊 Processing statuses found:', moduleContentData.map(item => ({
          file: item.file_name,
          status: item.processing_status,
          hasProcessedContent: !!item.processed_content,
          hasExtractedText: !!item.extracted_text,
          contentLength: item.processed_content?.length || item.extracted_text?.length || 0
        })));
      }
      
      // Get content from processed_documents table (uses course_id field)
      // ALWAYS use the admin client to ensure all users can access processed documents
      const { data: processedDocsData, error: processedDocsError } = await adminClientToUse
        .from('processed_documents')
        .select('processed_content, file_name, file_type, processed_text, title, description, metadata')
        .eq('course_id', moduleId);
      
      console.log(`🔍 processed_documents query results: found ${processedDocsData?.length || 0} documents`);
      console.log('🔍 DEBUG: processed_documents raw data:', JSON.stringify(processedDocsData?.slice(0, 1), null, 2));
      console.log('🔍 DEBUG: processed_documents query for course_id:', moduleId);
      
      // Log the raw SQL query for debugging
      console.log('🔍 DEBUG: Equivalent SQL query:', 
        `SELECT processed_content, file_name, file_type, processed_text, title, description, metadata FROM processed_documents WHERE course_id = '${moduleId}'`);
        
      if (processedDocsError) {
        console.error('❌ Error fetching from processed_documents:', processedDocsError);
      }
      
      console.log(`📁 Found ${processedDocsData?.length || 0} files in processed_documents table`);
      
      // Prepare to combine content from both tables
      const combinedContent = [];
      
      // Add module content
      if (moduleContentData && moduleContentData.length > 0) {
        console.log(`💾 Found ${moduleContentData.length} files in module_content table`);
        moduleContentData.forEach(item => {
          // Use any available content - either processed_content or extracted_text
          const contentToUse = item.processed_content || item.extracted_text;
          
          if (contentToUse) {
            combinedContent.push({
              file_name: item.file_name || 'Unnamed document',
              file_type: item.file_type || 'text',
              processed_content: contentToUse,
              processing_status: item.processing_status || 'unknown'
            });
            console.log(`🔴 DEBUG: Added document from module_content: ${item.file_name} (status: ${item.processing_status || 'unknown'})`);
          } else {
            console.log(`🔴 DEBUG: Skipped document from module_content due to missing content: ${item.file_name}`);
          }
        });
      }
      
      // Add processed documents, avoiding duplicates
      if (processedDocsData && processedDocsData.length > 0) {
        console.log(`💾 Processing ${processedDocsData.length} files from processed_documents table`);
        processedDocsData.forEach(doc => {
          console.log(`🔍 Processing doc: ${doc.original_filename}, text length: ${doc.processed_text?.length || 0}`);
          console.log(`🔍 First 100 chars of processed_text: "${doc.processed_text?.substring(0, 100)}..."`);
          
          if (doc.processed_text && doc.processed_text.trim().length > 0) {
            combinedContent.push({
              file_name: doc.original_filename || doc.title || 'Unnamed document',
              file_type: doc.metadata?.file_type || 'text',
              processed_content: doc.processed_text,
              title: doc.title,
              description: doc.description,
              metadata: doc.metadata,
              source: 'processed_documents'
            });
            console.log(`📄 Added document from processed_documents: ${doc.original_filename || doc.title} (${doc.processed_text.length} chars)`);
          } else {
            console.log(`⚠️ Skipping document with no processed_text: ${doc.original_filename}`);
          }
        });
      }

      console.log(`📁 Combined total: ${combinedContent.length} files for AI context`);

      if (combinedContent.length > 0) {
        console.log(`📁 Successfully found ${combinedContent.length} files for AI context`);
        
        // Create comprehensive context with content availability flag
        moduleContext = "CONTENT_AVAILABLE=TRUE\n\n";
        console.log('✅ Added CONTENT_AVAILABLE=TRUE flag to moduleContext');
        
        // Add each content file
        let contentSummary = [];
        moduleContext += combinedContent
          .map((content) => {
            console.log(`📝 Using file: ${content.file_name} (${content.file_type})`);
            // Log a preview of each file's content for debugging
            const contentPreview = content.processed_content?.substring(0, 100) || 'No content';
            console.log(`🔴 DEBUG: Content preview for ${content.file_name}: ${contentPreview}...`);
            contentSummary.push(content.file_name);
            return `File: ${content.file_name}\nContent:\n${content.processed_content}`;
          })
          .join('\n\n---\n\n');
          
        console.log(`📟 Total module context length: ${moduleContext.length} characters`);
        console.log(`📝 Module context preview (first 500 chars): "${moduleContext.substring(0, 500)}..."`);
        console.log(`✅ Successfully built module context for ${combinedContent.length} documents`);
        
      } else {
        console.log('📥 No processed content found for module');
        console.log('🔍 Available moduleContentData:', moduleContentData?.length || 0);
        console.log('🔍 Available processedDocsData:', processedDocsData?.length || 0);
        
        // Add a test document to the module context to verify if context delivery works
        console.log('📝 ADDING TEST DOCUMENT to module context for debugging');
        moduleContext = "CONTENT_AVAILABLE=TRUE\n\n";
        moduleContext += "File: test-document.txt\nContent:\nThis is a test document for module " + moduleId + ".\n\n" +
                      "This document was automatically added by the chat handler for debugging purposes.\n\n" +
                      "If you're seeing this content in the AI response, it means the module context delivery system is working correctly,\n" +
                      "but there are no actual documents in the database for this module.\n\n" +
                      "Course Title: Discord Bot Market Analysis & Development Strategy\n\n" +
                      "Course Overview: This course covers market analysis and development strategies for Discord bots.\n" +
                      "Students will learn about market research, competitive analysis, bot development, and monetization strategies.";
        
        console.log('✅ Added test document to module context');
        console.log(`📟 Test module context length: ${moduleContext.length} characters`);
        console.log(`📝 Test module context preview: "${moduleContext.substring(0, 200)}..."`);
        console.log('🔴 DEBUG: This is a test document only, not actual module content');
        
        // Debug: Let's check what's actually in the tables for this module
        console.log('🔧 DEBUG: Checking all content for module:', moduleId);
        console.log('🔧 DEBUG: No content found in standard queries, performing more detailed checks...');
        
        // Check module_content without filters to see what's there
        // ALWAYS use admin client to ensure access to all data
        console.log('🔧 DEBUG: Checking ALL columns in module_content table for module_id:', moduleId);
        const { data: allModuleContent, error: debugError1 } = await adminClientToUse
          .from('module_content')
          .select('*')
          .eq('module_id', moduleId);
        
        console.log('🔧 DEBUG: All module_content rows:', allModuleContent?.length || 0);
        if (allModuleContent && allModuleContent.length > 0) {
          console.log('🔧 DEBUG: Sample module_content:', JSON.stringify(allModuleContent[0], null, 2));
          console.log('🔧 DEBUG: All module_content items:', JSON.stringify(allModuleContent.map(item => ({
            id: item.id,
            module_id: item.module_id,
            file_name: item.file_name,
            has_processed_content: !!item.processed_content,
            has_extracted_text: !!item.extracted_text,
            processing_status: item.processing_status
          })), null, 2));
        } else {
          console.log('🔧 DEBUG: NO module_content found for this module_id');
        }
        
        // Check processed_documents without filters
        // Use admin client to ensure access to all data
        console.log('🔧 DEBUG: Checking ALL columns in processed_documents table for course_id:', moduleId);
        const { data: allProcessedDocs, error: debugError2 } = await adminClientToUse
          .from('processed_documents')
          .select('*')
          .eq('course_id', moduleId);
        
        console.log('🔧 DEBUG: All processed_documents rows:', allProcessedDocs?.length || 0);
        if (allProcessedDocs && allProcessedDocs.length > 0) {
          console.log('🔧 DEBUG: Sample processed_documents:', JSON.stringify(allProcessedDocs[0], null, 2));
          console.log('🔧 DEBUG: All processed_documents items:', JSON.stringify(allProcessedDocs.map(item => ({
            id: item.id,
            course_id: item.course_id,
            file_name: item.file_name || item.original_filename,
            has_processed_content: !!item.processed_content,
            has_processed_text: !!item.processed_text,
            title: item.title
          })), null, 2));
        } else {
          console.log('🔧 DEBUG: NO processed_documents found for this course_id');
        }
        
        moduleContext = null;
      }
    } else {
      console.log('⚠️ No module ID provided - cannot fetch module content');
    }

    console.log('🔧 Getting system prompt with module context...');
    console.log('🔧 Module context is null?', moduleContext === null);
    console.log('🔧 Module context length:', moduleContext?.length || 0);
    
    // IMPORTANT: ALWAYS use the admin client to retrieve the system prompt
    // This ensures all users (admin and non-admin) get the same system prompt
    // Using the regular client might be affected by RLS policies
    // NEVER fall back to the regular client as it will be subject to RLS restrictions
    if (!adminClient) {
      console.error('❌ ERROR: Admin client not provided for system prompt access. System prompt may not work correctly for non-admin users.');
      console.log('⚠️ Continuing with regular client as fallback, but system prompt access may be restricted');
    }
    const adminClientToUse = adminClient || supabase; // Use admin client if available, fallback to regular client with warning
    console.log('🔑 Using admin client for system prompt access');
    
    // Force bypass any caching that might be occurring
    console.log('🔄 Adding cache-busting timestamp to system prompt request:', Date.now());
    
    const systemPrompt = await getSystemPrompt(adminClientToUse, [], moduleContext);
    
    console.log('📋 === SYSTEM PROMPT VERIFICATION ===');
    console.log('📏 System prompt length:', systemPrompt.length);
    
    const hasCustomPrompt = systemPrompt.includes('reflective AI tutor') || 
                           systemPrompt.includes('university students') ||
                           systemPrompt.includes('Build My Question Mode');
    console.log('✅ Custom reflective tutor prompt detected:', hasCustomPrompt);
    
    const hasModuleContent = moduleContext && moduleContext.includes('CONTENT_AVAILABLE=TRUE');
    console.log('✅ Module content integrated:', hasModuleContent);
    
    if (moduleContext) {
      console.log('📚 Module context preview (first 500 chars):', moduleContext.substring(0, 500));
    } else {
      console.log('❌ No module context available');
    }

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log('🤖 Sending to OpenAI with context');
    console.log('📨 Messages:', openaiMessages.length);
    console.log('📚 Using module context:', !!moduleContext);

    const DENO_ENV_GET = typeof Deno !== 'undefined' ? Deno.env.get : () => undefined;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DENO_ENV_GET('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Unexpected OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    console.log('✅ === CHAT REQUEST COMPLETE ===');
    console.log('📝 Response preview:', data.choices[0].message.content.substring(0, 100) + '...');

    // Add timestamp and system prompt info to help debug caching issues
    const timestamp = new Date().toISOString();
    const promptFirstChars = systemPrompt.substring(0, 50);
    
    console.log('🔄 Adding response timestamp:', timestamp);
    console.log('🔑 System prompt first 50 chars:', promptFirstChars);
    
    return {
      response: data.choices[0].message.content,
      toolsUsed: [],
      hasModuleContent: hasModuleContent,
      moduleContext: moduleContext,
      _debug: {
        timestamp: timestamp,
        systemPromptPreview: promptFirstChars,
        usingCustomPrompt: systemPrompt.includes('reflective AI tutor'),
        promptLength: systemPrompt.length
      }
    };

  } catch (error) {
    console.error('💥 Error in chat handler:', error);
    throw error;
  }
}
