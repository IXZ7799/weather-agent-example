/**
 * Gemini Processor
 * Handles document processing using Google's Gemini API
 */

import { supabase } from '@/integrations/supabase/client';

export class GeminiProcessor {
  constructor() {
    this.apiKey = null;
    this.isConfigured = false;
  }
  
  /**
   * Generate metadata for a document using Gemini API
   * @param {string} content - The document content to analyze
   * @param {string} [fileName] - Optional file name for context
   * @returns {Promise<Object>} - Generated metadata including title and description
   */
  async generateMetadata(content, fileName = '') {
    try {
      console.log('Generating metadata with Gemini API...');
      
      // Truncate content if it's too long for the API
      const truncatedContent = content.length > 30000 ? 
        content.substring(0, 30000) + '...' : content;
      
      // Call the Supabase Edge Function for Gemini processing
      const { data, error } = await supabase.functions.invoke('gemini-metadata', {
        body: {
          text: truncatedContent,
          fileName: fileName
        }
      });
      
      if (error) {
        console.error('Gemini metadata generation error:', error);
        throw new Error(`Gemini API error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No metadata returned from Gemini API');
      }
      
      console.log('Gemini metadata generated successfully:', data);
      
      return {
        title: data.title || this.extractFallbackTitle(content, fileName),
        description: data.description || this.generateFallbackDescription(content),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Error generating metadata with Gemini, using fallback:', error);
      
      // Fallback to local extraction if API fails
      return {
        title: this.extractFallbackTitle(content, fileName),
        description: this.generateFallbackDescription(content),
        generatedAt: new Date().toISOString(),
        fallback: true
      };
    }
  }
  
  /**
   * Extract a title from document content as fallback
   * @param {string} content - The document content
   * @param {string} [fileName] - Optional file name
   * @returns {string} - Extracted title
   */
  extractFallbackTitle(content, fileName = '') {
    if (fileName) {
      // Use filename without extension as fallback title
      const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
      if (nameWithoutExtension) {
        return nameWithoutExtension;
      }
    }
    
    if (!content || typeof content !== 'string') {
      return 'Untitled Document';
    }
    
    try {
      // Try to find a title in the first few lines
      const lines = content.split('\n').slice(0, 10);
      
      // Look for patterns that might indicate a title
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // If line is short enough and not ending with punctuation, it might be a title
        if (trimmedLine.length <= 100 && 
            !trimmedLine.endsWith('.') && 
            !trimmedLine.endsWith('?') && 
            !trimmedLine.endsWith('!') &&
            trimmedLine.length >= 3) {
          return trimmedLine;
        }
        
        // Look for markdown or HTML headers
        if (trimmedLine.startsWith('# ') || 
            trimmedLine.startsWith('<h1>') || 
            trimmedLine.startsWith('<title>')) {
          // Clean up markdown/HTML
          return trimmedLine
            .replace(/^# /, '')
            .replace(/<\/?h1>/g, '')
            .replace(/<\/?title>/g, '')
            .trim();
        }
      }
      
      // If no good title found, use first non-empty line truncated
      const firstNonEmptyLine = lines.find(line => line.trim().length > 0) || '';
      const truncatedTitle = firstNonEmptyLine.trim().substring(0, 50);
      
      return truncatedTitle || 'Untitled Document';
    } catch (error) {
      console.error('Error extracting fallback title:', error);
      return 'Untitled Document';
    }
  }
  
  /**
   * Generate a description from document content as fallback
   * @param {string} content - The document content
   * @returns {string} - Generated description
   */
  generateFallbackDescription(content) {
    if (!content || typeof content !== 'string') {
      return 'No description available';
    }
    
    try {
      // Extract meaningful content for summarization
      // First, clean up the content
      const cleanContent = content
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
      
      // Extract paragraphs, ignoring very short lines
      const paragraphs = cleanContent
        .split('\n\n')
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(p => p.length > 30); // Only consider substantial paragraphs
      
      if (paragraphs.length === 0) {
        // If no substantial paragraphs, try to get any content
        const lines = cleanContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
          
        if (lines.length > 0) {
          // Take first few lines and combine
          const firstFewLines = lines.slice(0, 3).join(' ');
          return this.summarizeText(firstFewLines, 200);
        }
        
        return 'No description available';
      }
      
      // Skip the first paragraph if it looks like a title
      const startIndex = paragraphs[0]?.length < 60 ? 1 : 0;
      
      // Get the most informative paragraphs
      // Prioritize paragraphs with keywords like 'summary', 'overview', 'introduction'
      const keywordParagraphIndex = paragraphs.findIndex(p => 
        /\b(summary|overview|introduction|abstract|about)\b/i.test(p));
      
      let relevantText = '';
      
      if (keywordParagraphIndex >= 0) {
        // Use the paragraph with keywords
        relevantText = paragraphs[keywordParagraphIndex];
      } else {
        // Otherwise use first substantial paragraphs
        const relevantParagraphs = paragraphs.slice(startIndex, startIndex + 2);
        relevantText = relevantParagraphs.join(' ');
      }
      
      // Create a summarized description
      return this.summarizeText(relevantText, 200);
    } catch (error) {
      console.error('Error generating fallback description:', error);
      return 'No description available';
    }
  }
  
  /**
   * Summarize text to a specified length
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Maximum length of summary
   * @returns {string} - Summarized text
   */
  summarizeText(text, maxLength = 200) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Try to find a good sentence break point
    const truncated = text.substring(0, maxLength);
    
    // Look for the last sentence break
    const lastSentenceBreak = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? ')
    );
    
    if (lastSentenceBreak > maxLength * 0.5) {
      // If we found a good sentence break that's at least halfway through
      return text.substring(0, lastSentenceBreak + 1);
    }
    
    // Otherwise find the last space to avoid cutting words
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return text.substring(0, lastSpace) + '...';
    }
    
    // Last resort: just truncate
    return truncated + '...';
  }

  /**
   * Configure the processor with API credentials
   * @param {string} apiKey - The Gemini API key
   */
  configure(apiKey) {
    this.apiKey = apiKey;
    this.isConfigured = !!apiKey;
    return this.isConfigured;
  }

  /**
   * Process a document using Gemini API
   * @param {string} content - The content to process
   * @param {Object} options - Processing options
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Object>} - Processed document data
   */
  async processDocument(content, options = {}, progressCallback = () => {}) {
    if (!this.isConfigured) {
      throw new Error('Gemini processor is not configured. Please call configure() with a valid API key first.');
    }

    try {
      progressCallback({ step: 'gemini_processing', message: 'Processing with Gemini AI...' });
      
      // Mock implementation (replace with actual Gemini API call)
      // In a real implementation, this would call the Gemini API
      const processedData = {
        summary: this.generateMockSummary(content),
        keyPoints: this.generateMockKeyPoints(content),
        metadata: {
          processedAt: new Date().toISOString(),
          processorVersion: '1.0.0',
          options
        }
      };
      
      progressCallback({ step: 'complete', message: 'Gemini processing complete' });
      
      return processedData;
    } catch (error) {
      console.error('Error in Gemini processing:', error);
      throw new Error(`Gemini processing failed: ${error.message}`);
    }
  }
  
  /**
   * Generate a mock summary (for development/testing)
   * @param {string} content - The content to summarize
   * @returns {string} - Generated summary
   */
  generateMockSummary(content) {
    const contentLength = content.length;
    const wordCount = content.split(/\s+/).length;
    
    return `This document contains approximately ${wordCount} words (${contentLength} characters). It appears to be a technical document related to information security.`;
  }
  
  /**
   * Generate mock key points (for development/testing)
   * @param {string} content - The content to analyze
   * @returns {Array<string>} - Generated key points
   */
  generateMockKeyPoints(content) {
    return [
      'Document discusses information security concepts',
      'Contains technical information that may be relevant to security practices',
      'May include references to security protocols and best practices'
    ];
  }
}
