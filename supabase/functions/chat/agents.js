/**
 * Agent management for the Supabase Edge Function
 */

// Agent interface
// export interface Agent {
//   id: string;
//   name: string;
//   description: string;
//   instructions: string;
//   type: string;
//   security_focus: string | null;
//   code: string | null;
//   created_at: string;
//   updated_at: string;
// }

/**
 * Checks if a message is requesting a specific agent
 * @param {string} message The user message to check
 * @returns {string | null} The agent name if found, null otherwise
 */
export function extractAgentRequest(message) {
  const patterns = [
    /use\s+the\s+([\w\s]+?)\s+(?:for|to|agent)/i,
    /use\s+([\w\s]+?)\s+(?:for|to)/i,
    /can\s+(?:the\s+)?([\w\s]+?)\s+agent\s+help/i,
    /use\s+(?:the\s+)?([\w\s]+?)\s+agent/i,
    /ask\s+(?:the\s+)?([\w\s]+?)\s+agent/i,
    /have\s+(?:the\s+)?([\w\s]+?)\s+agent/i,
    /let\s+(?:the\s+)?([\w\s]+?)\s+agent/i,
    /([\w\s]+?)\s+agent\s+(?:should|can|could|would|to)/i,
    /([\w\s]+?)\s+agent[,:]?\s+/i,
    /can\s+([\w\s]+?)\s+help\s+me\s+with/i,
    /use\s+([\w\s]+?)\s+to\s+help/i,
    /securityauditlog/i,
    /security\s+audit\s+log/i,
    /weather/i,
  ];

  console.log('Checking message for agent requests:', message);

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let agentName = match[1].trim();
      agentName = agentName.replace(/\b(for|to|with|about|on|in|at|by)\b/gi, '').trim();
      
      // If the pattern was one of the specific agent names, agentName might be empty after stripping common words.
      // The specific agent patterns (like /weather/i) don't have a capturing group, so match[1] would be undefined.
      // We need to handle these cases.
      if (pattern.source === "securityauditlog" || pattern.source === "security\\s+audit\\s+log") {
        console.log('SecurityAuditLog agent detected by pattern');
        return 'SecurityAuditLog';
      }
      if (pattern.source === "weather") {
        console.log('Weather agent detected by pattern');
        return 'Weather';
      }
      
      if (agentName) { // Ensure agentName is not empty after cleaning
           console.log('Potential agent match found:', agentName);
           return agentName;
      }
    }
  }

  // Special case for SecurityAuditLog if not caught by regex with capturing groups
  if (message.toLowerCase().includes('securityauditlog') || 
      message.toLowerCase().includes('security audit log')) {
    console.log('SecurityAuditLog agent detected by includes');
    return 'SecurityAuditLog';
  }

  // Special case for Weather if not caught by regex with capturing groups
  if (message.toLowerCase().includes('weather')) {
    console.log('Weather agent detected by includes');
    return 'Weather';
  }

  return null;
}

/**
 * Gets all agents from the database
 * @param {any} supabaseClient The Supabase client
 * @returns {Promise<any[]>} An array of agents // Changed Agent[] to any[]
 */
export async function getAllAgents(supabaseClient) {
  try {
    const { data, error } = await supabaseClient
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return [];
    }

    console.log('Loaded agents from database:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getAllAgents:', error);
    return [];
  }
}

/**
 * Gets an agent by name (with fuzzy matching)
 * @param {any} supabaseClient The Supabase client
 * @param {string} name The name of the agent to get
 * @returns {Promise<any | null>} The agent or null if not found // Changed Agent to any
 */
export async function getAgentByName(supabaseClient, name) {
  try {
    console.log('Looking for agent with name:', name);
    
    const { data: allAgents, error } = await supabaseClient
      .from('agents')
      .select('*');

    if (error || !allAgents) {
      console.error('Error fetching agents for name search:', error);
      return null;
    }

    console.log('Available agents:', allAgents.map(a => a.name));

    let agent = allAgents.find(a => a.name === name);
    
    if (!agent) {
      agent = allAgents.find(a => 
        a.name.toLowerCase() === name.toLowerCase());
    }
    
    if (!agent) {
      agent = allAgents.find(a => 
        a.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(a.name.toLowerCase()));
    }

    if (agent) {
      console.log('Found agent:', agent.name);
    } else {
      console.log('No agent found for name:', name);
    }

    return agent || null;
  } catch (error) {
    console.error('Error in getAgentByName:', error);
    return null;
  }
}

/**
 * Formats all agents as system prompt instructions
 * @param {any[]} agents Array of agents // Changed Agent[] to any[]
 * @returns {string} A string containing all agent instructions for the system prompt
 */
export function formatAgentsForSystemPrompt(agents) {
  if (!agents || agents.length === 0) { // Added !agents check
    return '';
  }
  
  let prompt = '\n\n# Available Specialized Agents\n';
  prompt += 'You can use the following specialized agents for specific tasks:\n\n';
  
  agents.forEach(agent => {
    prompt += `## ${agent.name}\n`;
    prompt += `${agent.description}\n`;
    if (agent.security_focus) {
      prompt += `Security Focus: ${agent.security_focus}\n`;
    }
    prompt += '\n';
  });
  
  prompt += '\nWhen a user mentions any of these agent names or requests help with their specific functionality, ';
  prompt += 'you should switch to that agent\'s specialized instructions and respond as that agent would.\n';
  
  return prompt;
} 