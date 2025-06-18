
import { getBaseTeachingPrompt } from './prompts/base-prompt.js';
import { buildModuleContext } from './prompts/module-context.js';
import { buildToolsContext } from './prompts/tools-context.js';
import { getCustomSystemPrompt } from './prompts/custom-prompt.js';

export function getDefaultSystemPrompt() {
  return getBaseTeachingPrompt();
}

export async function getSystemPrompt(supabase, tools = [], moduleContext = null) {
  console.log('🔄 === SYSTEM PROMPT CONSTRUCTION START ===');
  console.log('🔍 Getting system prompt - checking for custom admin settings...');
  
  // Check if content is available by looking for the flag
  const contentAvailable = moduleContext && moduleContext.includes('CONTENT_AVAILABLE=TRUE');
  console.log('📚 Content available flag detected:', contentAvailable);
  
  // Debug the module context
  if (moduleContext) {
    console.log('🔴 DEBUG: Module context first 200 chars:', moduleContext.substring(0, 200));
    console.log('🔴 DEBUG: Module context length:', moduleContext.length);
    console.log('🔴 DEBUG: Contains CONTENT_AVAILABLE=TRUE?', moduleContext.includes('CONTENT_AVAILABLE=TRUE'));
    console.log('🔴 DEBUG: Contains FULL COURSE CONTENT?', moduleContext.includes('FULL COURSE CONTENT'));
  } else {
    console.log('🔴 DEBUG: Module context is null or empty');
  }
  
  // Try to get custom system prompt from database first
  const customPrompt = await getCustomSystemPrompt(supabase);
  
  let systemPrompt;
  if (customPrompt) {
    console.log('✅ USING CUSTOM SYSTEM PROMPT from admin settings');
    console.log('📏 Custom prompt length:', customPrompt.length, 'characters');
    
    // Verify it's the reflective tutor prompt
    const isReflectiveTutor = customPrompt.includes('reflective AI tutor') || 
                             customPrompt.includes('university students') ||
                             customPrompt.includes('Build My Question Mode');
    console.log('🎓 Confirmed reflective tutor prompt:', isReflectiveTutor);
    
    // Use the custom prompt as the base
    systemPrompt = customPrompt;
    
    // ALWAYS add module context when available, regardless of custom or default prompt
    if (moduleContext && contentAvailable) {
      console.log('📚 Adding course materials context to custom prompt');
      console.log('📏 Module context length:', moduleContext.length, 'characters');
      
      // Add critical override instruction for course overview questions
      systemPrompt += `\n\n🔥 CRITICAL OVERRIDE FOR COURSE OVERVIEW QUESTIONS:

When students ask about the course itself such as:
- "What is this course about?"
- "What will I learn?"
- "What are the course objectives?"
- "What topics are covered?"
- "What's in this course?"

You MUST:
1. IMMEDIATELY provide a direct, comprehensive answer based on the course materials below
2. OVERRIDE your usual reflective questioning approach for these specific questions
3. Give a detailed summary of the course content, structure, and learning objectives
4. Reference specific topics and materials from the course content
5. Be informative and helpful, not questioning

FOR ALL OTHER QUESTIONS: Continue with your normal reflective teaching approach.

📚 COMPLETE COURSE MATERIALS AVAILABLE:
${moduleContext}

⚠️ IMPORTANT: The course materials above contain everything you need to answer course overview questions directly. Use this content to provide comprehensive, informative responses about what the course covers.`;
    } else {
      console.log('📭 No module context available for this session');
      systemPrompt += `\n\n⚠️ NO COURSE MATERIALS AVAILABLE: No course content has been uploaded for this session. When asked about course content, politely explain that course materials need to be uploaded first.`;
    }
  } else {
    console.log('⚠️ No custom system prompt found, falling back to default base prompt');
    console.log('📝 Using fallback prompt from base-prompt.js');
    
    systemPrompt = getBaseTeachingPrompt();
    
    // Add module context for default prompt
    if (moduleContext) {
      console.log('📚 Adding module context to default system prompt');
      console.log('📏 Module context length:', moduleContext.length, 'characters');
      systemPrompt += buildModuleContext(moduleContext);
      
      // Add course overview exception for non-admin users too
      console.log('⭐ Adding course overview exception to default prompt');
      systemPrompt += `\n\n⭐ CRITICAL OVERRIDE - COURSE OVERVIEW QUESTIONS:\nWhen students ask about the course itself (e.g., "What is this course about?", "What will I learn?", "What are the course objectives?"), you MUST:\n1. OVERRIDE your usual questioning approach\n2. Provide a direct, clear summary based on the course materials above\n3. Explain the main topics, structure, and goals of the course\n4. Use a friendly, informative tone (not questioning)\n5. Reference specific content from the course materials\n6. NEVER ask the user to upload materials - you already have them\nThis is a mandatory exception to your usual teaching style.`;
    }
  }

  // Add tool information to system prompt (if any)
  if (tools && tools.length > 0) {
    console.log('🔧 Adding tools context to system prompt');
    console.log('🔢 Number of tools:', tools.length);
    systemPrompt += buildToolsContext(tools);
  } else {
    console.log('🔨 No tools available');
  }

  console.log('📊 === FINAL SYSTEM PROMPT STATS ===');
  console.log('📏 Total system prompt length:', systemPrompt.length, 'characters');
  
  // Log preview of final prompt to verify custom prompt and module context integration
  const finalPreview = systemPrompt.substring(0, 300);
  console.log('🔍 Final prompt preview (first 300 chars):', finalPreview);
  
  // Additional verification for custom prompt usage and module context
  if (customPrompt) {
    const hasReflectiveTutorKeywords = systemPrompt.includes('reflective AI tutor') && 
                                      systemPrompt.includes('Build My Question Mode');
    const hasModuleContext = moduleContext ? systemPrompt.includes('COMPLETE COURSE MATERIALS') : true;
    const hasCriticalOverride = systemPrompt.includes('CRITICAL OVERRIDE FOR COURSE OVERVIEW');
    
    console.log('✅ Custom reflective tutor prompt is active:', hasReflectiveTutorKeywords);
    console.log('✅ Module context properly integrated:', hasModuleContext);
    console.log('✅ Critical override instruction added:', hasCriticalOverride);
    
    if (!hasReflectiveTutorKeywords) {
      console.log('❌ WARNING: Custom prompt may have been corrupted or overridden');
    }
    if (moduleContext && !hasModuleContext) {
      console.log('❌ WARNING: Module context not properly integrated with custom prompt');
    }
  }
  
  console.log('✅ === SYSTEM PROMPT CONSTRUCTION COMPLETE ===');
  return systemPrompt;
}
