
/**
 * Utility functions for managing AI agents in the InfoSec AI Buddy application
 */
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Check if the agents table exists
 * Provides clear error messages when the table is missing
 */
async function checkAgentsTable() {
  try {
    // First try to access the agents table directly
    const { error } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    // If no error, the table exists
    if (!error) return true;
    
    // If we get a specific error about the table not existing
    if (error.code === '42P01') { // PostgreSQL code for 'relation does not exist'
      console.error('The agents table does not exist in your Supabase database.');
      toast.error(
        'The agents table does not exist. Please run the SQL setup script in the Supabase dashboard.'
      );
      return false;
    }
    
    // For other errors, just log and continue
    console.warn('Error checking agents table:', error);
    return false;
  } catch (error) {
    console.error('Unexpected error checking agents table:', error);
    return false;
  }
}

/**
 * Save an agent to the database
 * @param agent The agent to save
 * @returns The saved agent
 */
export async function saveAgent(agent) {
  try {
    // First, ensure the agents table exists
    const tableExists = await checkAgentsTable();
    if (!tableExists) return null;
    
    // Then insert the agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        name: agent.name,
        description: agent.description,
        instructions: agent.instructions,
        type: agent.type,
        security_focus: agent.securityFocus,
        code: agent.code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      instructions: data.instructions,
      type: data.type,
      securityFocus: data.security_focus,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error saving agent:', error);
    throw error;
  }
}

/**
 * Update an existing agent
 * @param id The ID of the agent to update
 * @param agent The updated agent data
 * @returns The updated agent
 */
export async function updateAgent(id, agent) {
  try {
    // Ensure the agents table exists
    const tableExists = await checkAgentsTable();
    if (!tableExists) return null;
    
    const updateData = {};
    if (agent.name) updateData.name = agent.name;
    if (agent.description !== undefined) updateData.description = agent.description;
    if (agent.instructions) updateData.instructions = agent.instructions;
    if (agent.type) updateData.type = agent.type;
    if (agent.securityFocus !== undefined) updateData.security_focus = agent.securityFocus;
    if (agent.code !== undefined) updateData.code = agent.code;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      instructions: data.instructions,
      type: data.type,
      securityFocus: data.security_focus,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error updating agent:', error);
    throw error;
  }
}

/**
 * Delete an agent from the database
 * @param id The ID of the agent to delete
 * @returns True if successful
 */
export async function deleteAgent(id) {
  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }
}

/**
 * Get all agents from the database
 * @returns An array of agents
 */
export async function getAgents() {
  try {
    // First, ensure the agents table exists
    const tableExists = await checkAgentsTable();
    if (!tableExists) return null;
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      instructions: agent.instructions,
      type: agent.type,
      securityFocus: agent.security_focus,
      code: agent.code,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at
    }));
  } catch (error) {
    console.error('Error getting agents:', error);
    return [];
  }
}

/**
 * Get a single agent by ID
 * @param id The ID of the agent to get
 * @returns The agent or null if not found
 */
export async function getAgentById(id) {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      instructions: data.instructions,
      type: data.type,
      securityFocus: data.security_focus,
      code: data.code,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error getting agent by ID:', error);
    return null;
  }
}
