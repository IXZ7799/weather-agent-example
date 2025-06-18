/**
 * AI Context Manager
 * Handles preparation of document context for AI conversations
 */

import { supabase } from '@/integrations/supabase/client.js';
import { API_KEYS } from '@/config/apiKeys';

export class AIContextManager {
  /**
   * Retrieve documents for a specific course to use as context
   * @param {string} courseId - The course ID to get documents for
   * @param {Object} options - Options for context retrieval
   * @returns {Promise<Array>} - Array of document contexts
   */
  async getDocumentContexts(courseId, options = {}) {
    const {
      limit = 5,
      maxTokensPerDocument = 10000,
      onlyApproved = true
    } = options;
    
    try {
      // Query for course documents
      let query = supabase
        .from('processed_documents')
        .select('*')
        .eq('course_id', courseId);
      
      // Only include approved documents if specified
      if (onlyApproved) {
        query = query.eq('is_approved', true);
      }
      
      // Get the documents
      const { data: documents, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`Failed to retrieve documents: ${error.message}`);
      }
      
      // Process each document for context
      return documents.map(doc => this._prepareDocumentContext(doc, maxTokensPerDocument));
    } catch (error) {
      console.error('Error retrieving document contexts:', error);
      return [];
    }
  }
  
  /**
   * Prepare a document for use as context
   * @param {Object} document - The document to prepare
   * @param {number} maxTokens - Maximum tokens to include
   * @returns {Object} - Prepared document context
   */
  _prepareDocumentContext(document, maxTokens) {
    // Estimate tokens (rough approximation: 4 chars ≈ 1 token)
    const estimatedTokens = document.processed_text.length / 4;
    
    let processedText = document.processed_text;
    
    // Truncate if necessary
    if (estimatedTokens > maxTokens) {
      processedText = document.processed_text.substring(0, maxTokens * 4);
      processedText += "\n[Document truncated due to length]";
    }
    
    return {
      id: document.id,
      title: document.title || document.original_filename,
      content: processedText,
      metadata: {
        filename: document.original_filename,
        description: document.description,
        created_at: document.created_at
      }
    };
  }
  
  /**
   * Generate a system prompt that incorporates document contexts
   * @param {Array} documentContexts - Array of document contexts
   * @param {string} baseSystemPrompt - Base system prompt to extend
   * @returns {string} - Complete system prompt with document contexts
   */
  generateSystemPromptWithContext(documentContexts, baseSystemPrompt) {
    if (!documentContexts || documentContexts.length === 0) {
      return baseSystemPrompt;
    }
    
    // Create context section
    let contextSection = "\n\n## EDUCATIONAL CONTEXT\n";
    contextSection += "The following educational materials have been provided by the teacher. Use this information to inform your responses:\n\n";
    
    // Add each document
    documentContexts.forEach((doc, index) => {
      contextSection += `### DOCUMENT ${index + 1}: ${doc.title}\n\n`;
      contextSection += doc.content;
      contextSection += "\n\n";
    });
    
    // Add instructions for using the context
    contextSection += "\n## USING THE EDUCATIONAL CONTEXT\n";
    contextSection += "- Reference specific parts of the educational materials when answering questions\n";
    contextSection += "- Cite the document title when using information from it\n";
    contextSection += "- If the educational materials don't contain information needed to answer a question, clearly state this and provide general knowledge\n";
    
    // Combine with base prompt
    return baseSystemPrompt + contextSection;
  }
  
  /**
   * Generate a complete prompt with context for OpenAI GPT-4.1
   * @param {string} courseId - The course ID to get context for
   * @param {string} baseSystemPrompt - Base system prompt
   * @param {Object} options - Context options
   * @returns {Promise<string>} - Complete system prompt
   */
  async generatePromptForCourse(courseId, baseSystemPrompt, options = {}) {
    const documentContexts = await this.getDocumentContexts(courseId, options);
    return this.generateSystemPromptWithContext(documentContexts, baseSystemPrompt);
  }
  
  /**
   * Create a chat completion with OpenAI GPT-4.1 using document context
   * @param {Array} messages - Chat messages
   * @param {Array} documentContexts - Document contexts to include
   * @param {Object} options - OpenAI API options
   * @returns {Promise<Object>} - OpenAI response
   */
  async createChatCompletion(messages, documentContexts = [], options = {}) {
    try {
      // Check if we have a system message
      let systemMessage = messages.find(msg => msg.role === 'system');
      
      // If we have document contexts and a system message, enhance it
      if (documentContexts.length > 0 && systemMessage) {
        const enhancedSystemPrompt = this.generateSystemPromptWithContext(
          documentContexts, 
          systemMessage.content
        );
        
        // Replace the system message with the enhanced one
        const updatedMessages = messages.map(msg => 
          msg.role === 'system' 
            ? { ...msg, content: enhancedSystemPrompt }
            : msg
        );
        
        // Use the updated messages
        messages = updatedMessages;
      }
      
      // Make API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEYS.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-1106-preview', // GPT-4.1
          messages,
          ...options
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating chat completion:', error);
      throw error;
    }
  }
}

export default AIContextManager;
