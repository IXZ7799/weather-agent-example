import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet.jsx';
import { Upload, FileText, X, Edit2, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client.js';
import { FileProcessor } from '@/utils/fileProcessor.js';
import { useFileProcessingStatus } from '@/hooks/useFileProcessingStatus.jsx';
import { RealContentValidator } from '@/utils/processors/realContentValidator.js';
import { GeminiProcessor } from '@/utils/processors/geminiProcessor.js';
import ProcessingStatusDisplay from '@/components/ProcessingStatusDisplay.jsx';

const UploadModal = ({ courseId = 'default', userId = 'teacher', onClose, onSaveSuccess }) => {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  
  // File and processing state
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedText, setProcessedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingStep, setProcessingStep] = useState(null); // 'uploading', 'validating', 'metadata', 'review', 'error'
  const [error, setError] = useState(null);
  
  // Metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Store the full processed data including LLM Whisperer metadata
  const [processedData, setProcessedData] = useState(null);
  
  // Processing hooks and services
  const { status, startProcessing, updateProgress, completeProcessing, resetProcessing } = useFileProcessingStatus();

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset states
    setError(null);
    setProcessedText('');
    setTitle('');
    setDescription('');
    setProcessedData(null);
    
    // Validate file type
    const supportedTypes = [
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'text/plain', // TXT
      'image/jpeg', // JPEG
      'image/png', // PNG
      'image/gif', // GIF
      'image/webp' // WEBP
    ];
    
    if (!supportedTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload a PDF, DOCX, PPTX, TXT, or image file.`);
      return;
    }
    
    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      setError(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum size is 20MB.`);
      return;
    }
    
    setSelectedFile(file);
    processFile(file);
  };
  
  const processFile = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    setProcessingStep('uploading');
    setError(null);
    setUploadProgress(0);
    setProcessingMessage('Preparing document for processing...');
    
    try {
      // Create a file processor instance
      const fileProcessor = new FileProcessor();
      
      // Process the file, passing the courseId
      const result = await fileProcessor.processFile(file, (progress, message) => {
        setUploadProgress(progress);
        setProcessingMessage(message);
      }, courseId); // Pass courseId here
      
      // Save the full processed data to state for later use
      setProcessedData(result);
      
      // Content validation permanently removed as per user request.
      // console.log('Content validation has been removed.'); 
      
      // Generate metadata
      setProcessingStep('metadata');
      setProcessingMessage('Generating document metadata with AI...');
      
      try {
        const geminiProcessor = new GeminiProcessor();
        const metadata = await geminiProcessor.generateMetadata(result.text);
        
        setTitle(metadata.title || file.name);
        setDescription(metadata.description || '');
      } catch (metadataError) {
        console.warn('Error generating metadata:', metadataError);
        // Fall back to filename if metadata generation fails
        setTitle(file.name);
        setDescription('No description available. You can add one manually.');
      }
      
      // Store processed text
      setProcessedText(result.text);
      
      // Complete processing
      setProcessingStep('review');
      setProcessingMessage('Document processed successfully!');
      toast.success('Document processed successfully!');
    } catch (error) {
      console.error('Error processing file:', error);
      
      // Provide more user-friendly error messages
      let userMessage = error.message || 'Failed to process document';
      
      // Make network errors more user-friendly
      if (userMessage.includes('Network error') || userMessage.includes('Connection error')) {
        userMessage = 'Unable to connect to the document processing service. Please check your internet connection and try again.';
      } 
      // Add more specific error handling for common issues
      else if (userMessage.includes('API key')) {
        userMessage = 'Document processing service configuration error. Please contact support.';
      }
      
      setError(userMessage);
      setProcessingStep('error');
      toast.error('Document processing failed', { description: userMessage });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!processedText || !selectedFile) {
      toast.error('No processed document to save');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!title.trim()) {
        throw new Error('Please provide a title for the document');
      }
      
      // Get current authenticated user's ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      if (!authUser) {
        throw new Error('User not authenticated. Cannot save document.');
      }
      const actualUserId = authUser.id;

      let finalCourseId = (courseId === 'default' || courseId === '') ? null : courseId;
      let newModuleCreated = false;

      // If courseId is effectively null (i.e., "default" was passed), create a new module
      if (finalCourseId === null) {
        if (!title.trim()) {
          throw new Error("A title is required to create a new course/module.");
        }
        console.log(`No specific courseId provided. Creating a new module with title: ${title}`);
        const { data: newModuleData, error: newModuleError } = await supabase
          .from('modules')
          .insert({
            name: title, // Use the document title as the module name
            description: description,
            user_id: actualUserId,
            is_global: true, // Assuming new modules from here should be global
            // content_summary and suggested_questions can be populated later or by triggers/functions
          })
          .select()
          .single();

        if (newModuleError) {
          throw new Error(`Failed to create new module: ${newModuleError.message}`);
        }
        if (!newModuleData || !newModuleData.id) {
          throw new Error('Failed to create new module: No ID returned.');
        }
        finalCourseId = newModuleData.id; // Use the new module's ID
        newModuleCreated = true;
        console.log(`New module created with ID: ${finalCourseId}`);
      }
      
      const dbCourseId = finalCourseId; // This is now either the existing courseId or the new module's ID

      // Save to Supabase (processed_documents table)
      const { data, error } = await supabase
        .from('processed_documents')
        .insert([
          {
            original_filename: selectedFile.name,
            title,
            description,
            processed_text: processedText,
            metadata: {
              file_type: selectedFile.type,
              file_size: selectedFile.size,
              processed_at: new Date().toISOString(),
              llm_whisperer_id: processedData?.llmWhispererId || null,
              llm_whisperer_metadata: processedData?.llmWhispererMetadata || null
            },
            llm_whisperer_id: processedData?.llmWhispererId || null,
            is_approved: false, // Requires teacher approval
            course_id: dbCourseId, 
            user_id: actualUserId // Use the fetched authenticated user ID
          }
        ])
        .select();
      
      console.log('Document saved with course_id:', dbCourseId);
      
      // If document was saved successfully, also save to module_content table
      if (data && data.length > 0) {
        const documentId = data[0].id;
        console.log('Saving to module_content table with document_id:', documentId);
        
        // First try with llm_whisperer_metadata column
        let moduleContentData = null;
        let moduleContentError = null;
        
        try {
          const result = await supabase
            .from('module_content')
            .insert({
              module_id: dbCourseId,
              file_name: selectedFile.name, 
              file_type: selectedFile.type, 
              file_size: selectedFile.size, 
              processed_content: processedText, 
              processing_status: 'completed', 
              document_id: documentId, // Link to the processed_documents table
              upload_date: new Date().toISOString(),
              user_id: actualUserId, // Include the user ID for ownership tracking
              llm_whisperer_metadata: processedData?.llmWhispererMetadata || null // Store the LLMWhisperer metadata for better context
            });
            
          moduleContentData = result.data;
          moduleContentError = result.error;
            
          if (moduleContentError) {
            // If error is about missing column, try without that column
            if (moduleContentError.message && moduleContentError.message.includes('llm_whisperer_metadata')) {
              console.log('llm_whisperer_metadata column not found, trying without it');
              throw new Error('Column not found');
            }
          } else {
            console.log('Successfully saved to module_content table with metadata');
          }
        } catch (columnError) {
          // Try again without the llm_whisperer_metadata column
          console.log('Retrying module_content insert without llm_whisperer_metadata');
          const result = await supabase
            .from('module_content')
            .insert({
              module_id: dbCourseId,
              file_name: selectedFile.name, 
              file_type: selectedFile.type, 
              file_size: selectedFile.size, 
              processed_content: processedText, 
              processing_status: 'completed', 
              document_id: documentId, // Link to the processed_documents table
              upload_date: new Date().toISOString(),
              user_id: actualUserId // Include the user ID for ownership tracking
            });
            
          moduleContentData = result.data;
          moduleContentError = result.error;
          
          if (moduleContentError) {
            console.error('Error saving to module_content table (second attempt):', moduleContentError);
          } else {
            console.log('Successfully saved to module_content table without metadata');
          }
        }
        
        if (moduleContentError) {
          console.error('Error saving to module_content table:', moduleContentError);
          // Don't throw error here, as we already saved to processed_documents
        }
      }
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A document with this name already exists. Please use a different file or rename it.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }
      
      toast.success('Document uploaded successfully!');
      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess(); // Call the callback to notify parent
      }
      handleClose();
    } catch (error) {
      console.error('Error saving document:', error);
      setError(error.message || 'Failed to save document');
      toast.error('Failed to save document', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setProcessedText('');
    setTitle('');
    setDescription('');
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setError(null);
    setProcessingStep(null);
    setUploadProgress(0);
    setProcessingMessage('');
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
    setIsOpen(false);
    resetState();
  };

  const handleRetry = () => {
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="flex gap-2 items-center bg-[#064646] text-[#0fcabb] border-[#0fcabb]/30 hover:bg-[#0fcabb]/20 hover:text-[#ffffff]"
          onClick={() => setIsOpen(true)}
        >
          <Upload className="w-4 h-4" />
          Upload Course Material
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-[#042f2f] border-l border-[#0fcabb]/30 text-[#aef5eb] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-[#0fcabb]/20">
          <SheetTitle className="text-[#0fcabb]">Upload Course Material</SheetTitle>
          <SheetDescription className="text-[#72f0df]/70">
            Upload documents for students to use as context with the AI. Supported formats: PDF, DOCX, PPTX, TXT, and images.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* File Upload Section */}
          {!selectedFile && !status.isProcessing && (
            <div className="space-y-4">
              <Label htmlFor="file-upload" className="text-[#0fcabb]">Select Document</Label>
              <div 
                className="border-2 border-dashed border-[#0fcabb]/30 rounded-lg p-8 text-center cursor-pointer hover:border-[#0fcabb]/60 transition-colors"
                onClick={() => document.getElementById('file-upload').click()}
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-[#0fcabb]/60" />
                <p className="text-[#aef5eb] mb-2">Drag and drop your document here</p>
                <p className="text-[#72f0df]/70 text-sm mb-4">or click to browse files</p>
                <Button 
                  onClick={() => document.getElementById('file-upload').click()}
                  variant="ghost"
                  size="sm"
                  className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
                >
                  <FileText size={16} className="mr-2" />
                  Browse Files
                </Button>
                <Input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.jpg,.jpeg,.png"
                />
              </div>
              <p className="text-xs text-[#72f0df]/70">
                Supported formats: PDF, DOCX, PPTX, TXT, JPG, PNG
              </p>
            </div>
          )}
          
          {/* Processing Status */}
          {isUploading && (
            <div className="space-y-3">
              <p className="text-sm text-[#aef5eb]">Processing: {selectedFile?.name}</p>
              <div className="w-full bg-[#064646] rounded-full h-2.5">
                <div 
                  className="bg-[#0fcabb] h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-[#72f0df]/80">{processingMessage}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Add cancellation logic if needed, for now, it resets.
                  resetState(); 
                  setIsOpen(false); // Or handleClose();
                  toast.info('Upload cancelled');
                }}
                className="w-full bg-red-900/30 border-red-500/40 text-red-200 hover:bg-red-900/40 hover:text-red-100"
              >
                Cancel Upload
              </Button>
            </div>
          )}

          {/* Processing Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-md p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
              {isUploading === false && processingStep === 'error' && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetry}
                    className="bg-red-900/30 border-red-500/40 text-red-200 hover:bg-red-900/40 hover:text-red-100"
                  >
                    Retry Upload
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Document Metadata Section */}
          {processingStep === 'review' && !isUploading && !error && (
            <div className="space-y-6">
              {/* Document Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="document-title" className="text-[#0fcabb]">Document Title</Label>
                  {!isEditingTitle ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-[#72f0df]"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-[#72f0df]"
                      onClick={() => setIsEditingTitle(false)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  )}
                </div>
                
                {!isEditingTitle ? (
                  <div className="bg-[#064646] p-3 rounded-md border border-[#0fcabb]/20">
                    <p className="text-[#aef5eb]">{title || 'Generating title...'}</p>
                  </div>
                ) : (
                  <Input
                    id="document-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-[#064646] border-[#0fcabb]/30 text-[#aef5eb] focus:border-[#0fcabb]"
                  />
                )}
                <p className="text-xs text-[#72f0df]/70">
                  AI-generated title based on document content
                </p>
              </div>
              
              {/* Document Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="document-description" className="text-[#0fcabb]">Description</Label>
                  {!isEditingDescription ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-[#72f0df]"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2 text-[#72f0df]"
                      onClick={() => setIsEditingDescription(false)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  )}
                </div>
                
                {!isEditingDescription ? (
                  <div className="bg-[#064646] p-3 rounded-md border border-[#0fcabb]/20 min-h-[80px]">
                    <p className="text-[#aef5eb]">{description || 'Generating description...'}</p>
                  </div>
                ) : (
                  <textarea
                    id="document-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#064646] border border-[#0fcabb]/30 rounded-md p-3 text-[#aef5eb] focus:border-[#0fcabb] min-h-[120px]"
                  />
                )}
                <p className="text-xs text-[#72f0df]/70">
                  AI-generated description of the document's educational content
                </p>
              </div>
            </div>
          )}
        </div>
        
        <SheetFooter className="pt-6 border-t border-[#0fcabb]/20">
          <Button 
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
            disabled={isSaving || isUploading}
          >
            <X size={16} className="mr-2" />
            Close
          </Button>
          {processingStep === 'review' && !isUploading && (
            <Button 
              onClick={handleSave}
              className="bg-[#0fcabb] text-[#042f2f] hover:bg-[#0fcabb]/80"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Document'
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default UploadModal;
