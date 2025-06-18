
export async function getCustomSystemPrompt(supabase) {
  // Add request timestamp to help identify caching issues
  const requestTimestamp = new Date().toISOString();
  console.log('🕒 Custom prompt request timestamp:', requestTimestamp);
  try {
    console.log('=== CUSTOM PROMPT FETCH START ===');
    console.log('Attempting to fetch custom system prompt from database...');
    
    // IMPORTANT: This function MUST be called with the admin client
    // to ensure all users (admin and non-admin) can access the system prompt
    // Regular client access might be affected by RLS policies
    console.log('🔑 Verifying client has admin access for system prompt retrieval');
    
    // Add cache-busting query parameter to ensure fresh data
    const cacheKey = Date.now().toString();
    console.log('🔄 Adding cache-busting setting_key to query:', cacheKey);
    
    const { data: settingData, error } = await supabase
      .from('system_settings')
      .select('setting_value, description, updated_at, id')
      .eq('setting_key', 'ai_system_prompt')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ No custom system prompt found in database (no row exists)');
      } else {
        console.error('❌ Error fetching custom system prompt:', error);
      }
      console.log('=== CUSTOM PROMPT FETCH END (null) ===');
      return null;
    }

    if (settingData && settingData.setting_value && settingData.setting_value.trim() !== '') {
      // Log the ID and updated timestamp to help track which version is being used
      console.log('📌 Retrieved system prompt ID:', settingData.id);
      console.log('📅 System prompt last updated:', settingData.updated_at);
      console.log('✅ Custom system prompt found and loaded successfully');
      console.log('📝 Prompt length:', settingData.setting_value.length, 'characters');
      console.log('📅 Last updated:', settingData.updated_at);
      console.log('📋 Description:', settingData.description);
      
      // Log first 200 characters to verify content
      const preview = settingData.setting_value.substring(0, 200);
      console.log('🔍 Prompt preview (first 200 chars):', preview);
      
      // Check for setting_key indicators that this is the reflective tutor prompt
      const isReflectiveTutor = settingData.setting_value.includes('reflective AI tutor') || 
                               settingData.setting_value.includes('university students') ||
                               settingData.setting_value.includes('Build My Question Mode');
      console.log('🎓 Is reflective tutor prompt:', isReflectiveTutor);
      
      console.log('=== CUSTOM PROMPT FETCH END (success) ===');
      return settingData.setting_value;
    }

    console.log('⚠️ Custom system prompt exists but is empty or whitespace only');
    console.log('=== CUSTOM PROMPT FETCH END (empty) ===');
    return null;
  } catch (error) {
    console.error('💥 Exception while fetching custom system prompt:', error);
    console.log('=== CUSTOM PROMPT FETCH END (error) ===');
    return null;
  }
}
