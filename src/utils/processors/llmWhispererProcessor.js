/**
 * LLM Whisperer Processor
 * Handles document processing using LLM techniques via Supabase Edge Function
 */

import { supabase } from '@/integrations/supabase/client';

export class LLMWhispererProcessor {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
  }

  /**
   * Process a document using LLM Whisperer via Supabase Edge Function
   * @param {File} file - The file to process
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Object>} - Processed document data
   */
  async processDocument(file, progressCallback = () => {}) {
    try {
      progressCallback({ step: 'preprocessing', message: 'Preparing document for processing...' });
      
      // Convert file to base64 for transmission
      const fileData = await this.fileToBase64(file);
      
      progressCallback({ step: 'processing', message: 'Sending to LLM Whisperer API...' });
      
      // Process via Supabase Edge Function
      const result = await this.callLLMWhispererFunction(fileData, file.name, progressCallback);
      
      if (!result || result.error) {
        throw new Error(result?.error || 'Failed to process document');
      }
      
      progressCallback({ step: 'complete', message: 'Document processing complete' });
      
      // Return the processed data
      return {
        text: result.text || result.extracted_text || '',
        metadata: result.metadata || {},
        documentId: result.document_id || result.id || `llm-${Date.now()}`,
      };
    } catch (error) {
      console.error('Error in LLM document processing:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }
  
  /**
   * Call the LLM Whisperer Supabase Edge Function
   * @param {string} fileData - Base64 encoded file data
   * @param {string} fileName - Name of the file
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Object>} - API response
   */
  async callLLMWhispererFunction(fileData, fileName, progressCallback) {
    let retries = 0;
    let lastError = null;
    
    while (retries < this.maxRetries) {
      try {
        progressCallback({ 
          step: 'processing', 
          message: `Processing document via LLM Whisperer${retries > 0 ? ` (retry ${retries}/${this.maxRetries})` : ''}...` 
        });
        
        // Call the Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('llm-whisperer', {
          body: {
            fileData,
            fileName,
            options: {
              outputMode: 'layout_preserving',
              processingMode: 'ocr',
              pages: 'all'
            }
          }
        });
        
        if (error) {
          throw error;
        }
        
        return data;
      } catch (error) {
        lastError = error;
        retries++;
        
        // If the error indicates we should not retry, break immediately
        if (error.message?.includes('not retriable') || 
            error.retriable === false) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (retries < this.maxRetries) {
          const waitTime = Math.pow(2, retries) * 1000;
          progressCallback({ 
            step: 'processing', 
            message: `Retrying in ${waitTime/1000} seconds...` 
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError || new Error('Failed to process document after multiple attempts');
  }
  
  /**
   * Convert a file to base64 encoding
   * @param {File} file - The file to convert
   * @returns {Promise<string>} - Base64 encoded file
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          // Get the base64 string (remove the data URL prefix)
          const base64String = reader.result.toString().split(',')[1];
          resolve(base64String);
        } catch (error) {
          reject(new Error(`Failed to convert file to base64: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Extract text content from a file (fallback method)
   * @param {File} file - The file to extract text from
   * @returns {Promise<string>} - Extracted text content
   */
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          resolve(text);
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
}
