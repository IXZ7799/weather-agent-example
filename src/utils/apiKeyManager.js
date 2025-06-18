/**
 * API Key Manager
 * Handles secure retrieval of API keys from environment variables
 * MIGRATION NOTE: This file has been updated to use only environment variables
 * and not retrieve keys from the database anymore.
 */

import { supabase } from '@/integrations/supabase/client';

// Cache for API keys to avoid repeated lookups
const keyCache = new Map();

/**
 * Get an API key from environment variables
 * @param {string} keyName - The name of the API key to retrieve
 * @param {string} fallbackEnvVar - Optional fallback environment variable name
 * @returns {Promise<string>} - The API key value
 */
export async function getApiKey(keyName, fallbackEnvVar = null) {
  // Check cache first
  if (keyCache.has(keyName)) {
    return keyCache.get(keyName);
  }

  try {
    // Use environment variables (for both development and production)
    const env = import.meta.env || {};
    let envKey = null;
    
    if (fallbackEnvVar && env[fallbackEnvVar]) {
      envKey = env[fallbackEnvVar];
    }
    
    // Cache the environment key if found
    if (envKey) {
      keyCache.set(keyName, envKey);
    }
    
    return envKey;
  } catch (error) {
    console.error(`Failed to retrieve API key ${keyName}:`, error);
    return null;
  }
}

/**
 * Get all API keys at once (admin only)
 * @returns {Promise<Object>} - Object containing all API keys
 */
export async function getAllApiKeys() {
  try {
    const { data, error } = await supabase.rpc('get_all_api_keys');
    
    if (error) {
      console.error('Error fetching all API keys:', error);
      return {};
    }
    
    return data || {};
  } catch (error) {
    console.error('Failed to retrieve all API keys:', error);
    return {};
  }
}

/**
 * Clear the API key cache
 */
export function clearApiKeyCache() {
  keyCache.clear();
}

export default {
  getApiKey,
  getAllApiKeys,
  clearApiKeyCache
};
