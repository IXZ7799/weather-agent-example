// secureApi.js - Secure API access through Supabase Edge Functions
import { supabase } from './client';

/**
 * Secure API client that uses Supabase Edge Functions to access data
 * This avoids permission issues by using the service role key on the server
 */
export const secureApi = {
  /**
   * Get modules for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of modules
   */
  async getModules(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('data-access', {
        body: {
          action: 'getModules',
          userId
        }
      });

      if (error) throw new Error(error.message);
      return data.data || [];
    } catch (err) {
      console.error('Error loading modules:', err);
      throw err;
    }
  },

  /**
   * Get conversations for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of conversations
   */
  async getConversations(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('data-access', {
        body: {
          action: 'getConversations',
          userId
        }
      });

      if (error) throw new Error(error.message);
      return data.data || [];
    } catch (err) {
      console.error('Error loading conversations:', err);
      throw err;
    }
  },

  /**
   * Get a global setting value
   * @param {string} settingKey - The setting key
   * @returns {Promise<string>} - The setting value
   */
  async getGlobalSetting(settingKey) {
    try {
      const { data, error } = await supabase.functions.invoke('data-access', {
        body: {
          action: 'getGlobalSettings',
          params: {
            settingKey
          }
        }
      });

      if (error) throw new Error(error.message);
      return data.data?.[0]?.setting_value || null;
    } catch (err) {
      console.error(`Error loading setting ${settingKey}:`, err);
      throw err;
    }
  },

  /**
   * Check if the current user is an admin
   * @returns {Promise<boolean>} - True if admin, false otherwise
   */
  async checkIsAdmin() {
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.functions.invoke('data-access', {
        body: {
          action: 'checkAdmin',
          userId: user.id
        }
      });

      if (error) throw new Error(error.message);
      return data.data?.isAdmin || false;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  }
};

export default secureApi;
