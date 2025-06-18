import { mastra, loadDynamicAgents, getMastraAgent, getAllMastraAgents, initializeMastra, getScaffoldingAgent } from '../mastra';
import { checkMastraScaffoldingStatus } from './scaffolding';

/**
 * Mastra integration utilities for the admin panel
 */

/**
 * Initialize Mastra with current agents from the database
 */
export async function initializeMastraForAdmin() {
  try {
    await initializeMastra();
    console.log('Mastra initialized successfully for admin panel');
  } catch (error) {
    console.error('Failed to initialize Mastra for admin panel:', error);
  }
}

/**
 * Refresh Mastra agents when agents are updated in the admin panel
 */
export async function refreshMastraAgents() {
  try {
    // Clear existing dynamic agents (keep default)
    const agents = getAllMastraAgents();
    Object.keys(agents).forEach(key => {
      if (key !== 'default') {
        delete agents[key];
      }
    });
    
    // Reload agents from database
    await loadDynamicAgents();
    console.log('Mastra agents refreshed successfully');
  } catch (error) {
    console.error('Failed to refresh Mastra agents:', error);
  }
}

/**
 * Check if Mastra is properly configured
 */
export function isMastraConfigured() {
  try {
    const agents = getAllMastraAgents();
    return Object.keys(agents).length > 0;
  } catch (error) {
    console.error('Error checking Mastra configuration:', error);
    return false;
  }
}

/**
 * Get comprehensive Mastra status including scaffolding agent
 */
export function getMastraStatus() {
  try {
    const agents = getAllMastraAgents();
    const agentNames = Object.keys(agents);
    
    return {
      isConfigured: agentNames.length > 0,
      agentCount: agentNames.length,
      agents: agentNames,
      hasScaffoldingAgent: agentNames.includes('scaffolding')
    };
  } catch (error) {
    console.error('Error getting Mastra status:', error);
    return {
      isConfigured: false,
      agentCount: 0,
      agents: [],
      hasScaffoldingAgent: false
    };
  }
}

/**
 * Test Mastra scaffolding agent functionality specifically
 */
export async function testMastraScaffoldingAgent() {
  try {
    // First check if the scaffolding agent exists in Mastra
    const scaffoldingAgent = getScaffoldingAgent();
    if (!scaffoldingAgent) {
      return {
        success: false,
        message: 'Scaffolding agent not found in Mastra configuration'
      };
    }
    
    // Then check if the scaffolding edge function is working
    const scaffoldingStatus = await checkMastraScaffoldingStatus();
    
    return {
      success: scaffoldingStatus.isAvailable,
      message: scaffoldingStatus.message
    };
  } catch (error) {
    return {
      success: false,
      message: `Error testing scaffolding agent: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test Mastra agent functionality
 */
export async function testMastraAgent(agentName = 'default') {
  try {
    const agent = getMastraAgent(agentName);
    if (!agent) {
      return {
        success: false,
        message: `Agent '${agentName}' not found`
      };
    }
    
    // For now, just check if agent exists and has required properties
    const hasName = agent.name && agent.name.length > 0;
    const hasInstructions = agent.instructions && agent.instructions.length > 0;
    
    if (hasName && hasInstructions) {
      return {
        success: true,
        message: `Agent '${agentName}' is properly configured`
      };
    } else {
      return {
        success: false,
        message: `Agent '${agentName}' is missing required properties`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error testing agent: ${error.message}`
    };
  }
}
