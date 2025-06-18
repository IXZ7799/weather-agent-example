/**
 * API key configuration for external services
 * Uses environment variables only
 * 
 * MIGRATION NOTE: This file has been updated to use only environment variables
 * and not retrieve keys from the database anymore.
 */

import { getApiKey } from '@/utils/apiKeyManager';

// Import environment variables from Vite if available
const env = import.meta.env || {};

// API key configuration with async getters
export const API_KEYS = {
  // Get LLMWhisperer API key
  async getLLMWhispererKey() {
    return await getApiKey(null, 'VITE_LLM_WHISPERER_API_KEY') || '';
  },
  
  // Get Google Gemini API key
  async getGeminiKey() {
    return await getApiKey(null, 'VITE_GEMINI_API_KEY') || '';
  },
  
  // Get OpenAI API key
  async getOpenAIKey() {
    return await getApiKey(null, 'VITE_OPENAI_API_KEY') || '';
  }
};

export default API_KEYS;