import { Mastra, Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { getAllAgents } from '../utils/agentLoader';
import { Agent as CustomAgentInterface } from '../utils/agentManagement';
import { healthCheck } from './health';

/**
 * Mastra configuration for InfoSec AI Buddy
 * This file connects our dynamic agent system with the Mastra platform
 */
export const mastra = new Mastra({
  agents: {
    // Default agent for when no specific agent is requested
    default: new Agent({
      name: 'InfoSec Default Agent',
      instructions: 'You are a cybersecurity-focused AI assistant that helps with information security topics, network security, and cybersecurity education.',
      model: openai('gpt-4o-mini'),
    }),
    
    // Scaffolding agent for code generation
    scaffolding: new Agent({
      name: 'InfoSec Scaffolding Agent',
      instructions: `You are a specialized scaffolding agent for the InfoSec AI Buddy application.

Your role is to help generate code templates and structures for information security related components with a focus on:

1. Security best practices (input validation, output encoding, authentication checks)
2. Modern React patterns with TypeScript
3. Clean, well-documented code with security considerations explicitly commented
4. Defensive coding techniques to prevent common vulnerabilities
5. Integration with the existing InfoSec AI Buddy application architecture

When generating code, include:
- Proper TypeScript typing
- Security-focused comments explaining why certain approaches were taken
- Error handling that doesn't expose sensitive information
- Input validation where appropriate
- Clear file structure recommendations

Your output should be production-ready, security-focused code that can be directly used in the application.

Format your response with:
1. Complete code for the requested component
2. Recommended file path
3. Brief integration guidance`,
      model: openai('gpt-4o-mini'),
    }),
  },
});

/**
 * Dynamically load and register agents from the database
 * This function should be called after the Mastra instance is created
 */
export async function loadDynamicAgents(): Promise<void> {
  try {
    const customAgents = await getAllAgents();
    
    customAgents.forEach((agent: CustomAgentInterface) => {
      const agentKey = agent.name.toLowerCase().replace(/\s+/g, '-');
      
      // Create new agent and add to the existing agents object
      const newAgent = new Agent({
        name: agent.name,
        instructions: agent.instructions,
        model: openai('gpt-4o-mini'), // Using OpenAI model instance
      });
      
      // Add the agent to the mastra instance
      (mastra as any).agents[agentKey] = newAgent;
    });
    
    console.log(`Loaded ${customAgents.length} dynamic agents`);
  } catch (error) {
    console.error('Error loading dynamic agents:', error);
  }
}

/**
 * Get a Mastra agent by name or key
 */
export function getMastraAgent(nameOrKey: string): Agent | null {
  const agents = (mastra as any).agents;
  
  // Try direct key lookup first
  if (agents[nameOrKey]) {
    return agents[nameOrKey];
  }
  
  // Try converted name lookup
  const convertedKey = nameOrKey.toLowerCase().replace(/\s+/g, '-');
  if (agents[convertedKey]) {
    return agents[convertedKey];
  }
  
  // Return default agent if nothing found
  return agents.default || null;
}

/**
 * Get all available Mastra agents
 */
export function getAllMastraAgents(): Record<string, Agent> {
  return (mastra as any).agents;
}

/**
 * Get the scaffolding agent specifically
 */
export function getScaffoldingAgent(): Agent {
  return (mastra as any).agents.scaffolding;
}

/**
 * Initialize Mastra with dynamic agents
 * Call this function to load all agents from the database
 */
export async function initializeMastra(): Promise<void> {
  await loadDynamicAgents();
}

// Export health check function for Mastra platform
export { healthCheck };

// Also export as default for compatibility
export default mastra;
