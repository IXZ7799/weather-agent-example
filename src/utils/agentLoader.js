/**
 * Agent loader utility for the InfoSec AI Buddy application
 * Loads agents from the database and makes them available for use in the AI system
 */
import { getAgents, Agent } from './agentManagement';

/**
 * Cache of loaded agents to avoid repeated database calls
 */
let agentCache: Agent[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets all agents from the database or cache
 * @param forceRefresh Force a refresh of the cache
 * @returns An array of agents
 */
export async function getAllAgents(forceRefresh = false): Promise<Agent[]> {
  const now = Date.now();
  
  // Use cache if available and not expired
  if (!forceRefresh && agentCache && (now - lastCacheTime < CACHE_TTL)) {
    return agentCache;
  }
  
  // Fetch agents from database
  try {
    const agents = await getAgents();
    agentCache = agents;
    lastCacheTime = now;
    return agents;
  } catch (error) {
    console.error('Error loading agents:', error);
    // If we have a cache, return it even if expired
    if (agentCache) {
      return agentCache;
    }
    return [];
  }
}

/**
 * Gets an agent by name
 * @param name The name of the agent to get
 * @returns The agent or null if not found
 */
export async function getAgentByName(name: string): Promise<Agent | null> {
  const agents = await getAllAgents();
  return agents.find(agent => agent.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Formats all agents as system prompt instructions
 * @returns A string containing all agent instructions for the system prompt
 */
export async function formatAgentsForSystemPrompt(): Promise<string> {
  const agents = await getAllAgents();
  
  if (agents.length === 0) {
    return '';
  }
  
  let prompt = '\n\n# Available Specialized Agents\n';
  prompt += 'You can use the following specialized agents for specific tasks:\n\n';
  
  agents.forEach(agent => {
    prompt += `## ${agent.name}\n`;
    prompt += `${agent.description}\n`;
    if (agent.securityFocus) {
      prompt += `Security Focus: ${agent.securityFocus}\n`;
    }
    prompt += '\n';
  });
  
  prompt += '\nTo use a specialized agent, indicate which agent should handle the request.\n';
  
  return prompt;
}

/**
 * Gets the instructions for a specific agent
 * @param agentName The name of the agent
 * @returns The agent instructions or null if not found
 */
export async function getAgentInstructions(agentName: string): Promise<string | null> {
  const agent = await getAgentByName(agentName);
  return agent ? agent.instructions : null;
}
