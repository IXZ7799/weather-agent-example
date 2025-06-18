/**
 * File processor service for InfoSec AI Buddy
 * Handles document processing using LLMWhisperer
 */

import { LLMWhispererProcessor } from './processors/llmWhispererProcessor';
import { supabase } from '@/integrations/supabase/client';

export class FileProcessor {
  constructor() {
    this.llmWhispererProcessor = new LLMWhispererProcessor();
  }

  /**
   * Process a file for AI context
   * @param {File} file - The file to process
   * @param {Function} progressCallback - Callback for progress updates
   * @param {string} [courseId=null] - Optional course ID to associate the document with.
   * @returns {Promise<Object>} - Processed document data
   */
  async processFile(file, progressCallback = () => {}, courseId = null) {
    try {
      progressCallback(5, 'Starting document processing...');
      
      // Process with LLMWhisperer
      const processedData = await this.llmWhispererProcessor.processDocument(file, progressCallback);
      
      // Prepare file details for storage
      const fileDetails = {
        name: file.name,
        type: file.type,
        size: file.size
      };

      // FileProcessor.processFile will now only extract text and metadata, not save to DB.
      // DB operations will be handled by the calling components (UploadModal, ModuleManagement).

      // processedData contains: { text, metadata (from LLMWhisperer), documentId (llmWhispererId) }
      
      return {
        text: processedData.text,
        llmWhispererMetadata: processedData.metadata, // Metadata from LLMWhisperer
        llmWhispererId: processedData.documentId,     // Identifier from LLMWhisperer
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (error) {
      console.error('File processing error in FileProcessor.processFile catch block:', error);
      // Ensure the re-thrown error is an actual Error object with a meaningful message
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error || 'An unspecified error occurred during file processing.'));
      }
    }
  }

  /**
   * Store processed document in Supabase
   * @param {Object} fileDetails - Object containing { name, type, size } of the original file
   * @param {Object} processedData - Processed document data { text, metadata, documentId }
   * @param {string|null} courseId - The ID of the course to associate with.
   * @returns {Promise<Object>} - Object containing { data, error } from Supabase client (for processed_documents insert)
   */
  async _storeProcessedDocument(fileDetails, processedData, courseId = null) {
    const { name: fileName, type: fileType, size: fileSize } = fileDetails;
    const { text, metadata, documentId: llmWhispererId } = processedData;
    
    // Get authenticated user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.error('No authenticated user found when trying to store document');
      return { data: null, error: { message: 'Authentication required to save documents.' } };
    }
    
    // Convert courseId to UUID if provided
    let dbCourseId = null;
    if (courseId) {
      dbCourseId = courseId;
    }
    
    console.log(`Inserting into processed_documents. course_id: ${dbCourseId}, user_id: ${userId}, llm_whisperer_id: ${llmWhispererId}`);
    
    // Insert into processed_documents table
    const { data: processedDocData, error: processedDocError, status, statusText, count } = await supabase
      .from('processed_documents')
      .insert({
        original_filename: fileName,
        processed_text: text,
        metadata: {
          file_type: fileType,
          file_size: fileSize,
          llm_whisperer_id: llmWhispererId,
          processed_at: new Date().toISOString()
        },
        course_id: dbCourseId,
        user_id: userId,
        llm_whisperer_id: llmWhispererId // Store the LLMWhisperer ID for reference
      })
      .select();
    
    console.log('Supabase insert into processed_documents result:', { data: processedDocData, error: processedDocError, status, statusText, count });
    
    if (processedDocError) {
      console.error('Error inserting into processed_documents:', processedDocError);
      return { data: null, error: processedDocError };
    }
    
    if (!processedDocData || !processedDocData.id) {
      console.error("processed_documents insert succeeded but did not return data or id. Full response:", { data: processedDocData, error: processedDocError, status, statusText, count });
      return { data: null, error: { message: "Failed to get ID from processed_documents insert after successful operation."} };
    }
    
    const originalDocumentId = processedDocData.id;

    // Always attempt to insert into module_content. 
    // dbCourseId will be null if no specific courseId was provided, 
    // assuming module_content.module_id is nullable or a default general module_id is handled by DB/RLS.
    console.log(`Attempting to insert into module_content. module_id: ${dbCourseId}, document_id: ${originalDocumentId}`);
    const { data: moduleContentData, error: moduleContentError } = await supabase
      .from('module_content')
      .insert({
        module_id: dbCourseId, // This can be null if dbCourseId is null
        file_name: fileName, 
        file_type: fileType, 
        file_size: fileSize, 
        processed_content: text, 
        processing_status: 'completed', 
        document_id: originalDocumentId, // Link to the processed_documents table
        upload_date: new Date().toISOString(),
        user_id: userId, // Include the user ID for ownership tracking
        llm_whisperer_metadata: metadata // Store the LLMWhisperer metadata for better context
      })
      .select();

      if (moduleContentError) {
        console.error(`Error inserting into module_content (module_id: ${dbCourseId}):`, moduleContentError);
        // Log error but do not make the primary operation fail
      } else {
        console.log(`Successfully inserted into module_content for module_id: ${dbCourseId || 'NULL'}`, moduleContentData);
      }
    
    return { data: processedDocData, error: null };
  }

  /**
   * Generate metadata for document using Gemini
   * @param {string} text - Processed document text
   * @returns {Promise<Object>} - Generated metadata
   */
  async generateMetadataWithGemini(text, fileName) {
    try {
      // Implement Gemini API call here for title and description generation
      // This is a placeholder for the actual implementation
      
      // For now, return basic metadata
      return {
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        description: `Document processed with LLMWhisperer containing ${text.length} characters.`
      };
    } catch (error) {
      console.error('Metadata generation error:', error);
      throw error;
    }
  }

  /**
   * Retrieve a processed document by ID
   * @param {string} documentId - The document ID to retrieve
   * @returns {Promise<Object>} - The document data
   */
  async getProcessedDocument(documentId) {
    const { data, error } = await supabase
      .from('processed_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      throw new Error(`Failed to retrieve document: ${error.message}`);
    }
    
    return data;
  }
}

export default FileProcessor;
