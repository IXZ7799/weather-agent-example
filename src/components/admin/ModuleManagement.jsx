import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Clock, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { FileProcessor } from '@/utils/fileProcessor';
import UploadModal from '../UploadModal';
import GlobalModuleSelector from './GlobalModuleSelector';
import { useGlobalActiveModule } from '@/hooks/useGlobalActiveModule';

const ModuleManagement = ({ refreshTrigger = 0 }) => {
  const [modules, setModules] = useState([]);
  const [moduleContent, setModuleContent] = useState({});
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the global active module hook for real-time updates
  const { activeModule, setGlobalActiveModule, refreshActiveModule } = useGlobalActiveModule();
  
  // Force re-render when refreshTrigger changes or when modules tab is clicked
  useEffect(() => {
    // Refresh the active module state to ensure it's up to date
    refreshActiveModule();
  }, [refreshTrigger, refreshActiveModule]);

  useEffect(() => {
    loadModules();
    
    // Initial load on component mount
    
    // Set up real-time subscription for module changes
    const moduleChannel = supabase
      .channel('modules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'modules'
        },
        (payload) => {
          console.log('Module change detected:', payload);
          handleModuleChange(payload);
        }
      )
      .subscribe();

    // Set up real-time subscription for module content changes
    const contentChannel = supabase
      .channel('module-content-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_content'
        },
        (payload) => {
          console.log('Module content change detected:', payload);
          handleContentChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(moduleChannel);
      supabase.removeChannel(contentChannel);
    };
  }, []);

  const handleModuleChange = (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        setModules(prev => {
          // Check if module already exists to prevent duplicates
          const exists = prev.some(m => m.id === newRecord.id);
          if (exists) return prev;
          
          const updatedModules = [newRecord, ...prev];
          toast.success(`New course "${newRecord.name}" created!`);
          return updatedModules;
        });
        // Load content for the new module
        loadModuleContent(newRecord.id);
        break;
        
      case 'UPDATE':
        setModules(prev => prev.map(m => 
          m.id === newRecord.id ? newRecord : m
        ));
        break;
        
      case 'DELETE':
        setModules(prev => prev.filter(m => m.id !== oldRecord.id));
        // Clean up content state
        setModuleContent(prev => {
          const updated = { ...prev };
          delete updated[oldRecord.id];
          return updated;
        });
        break;
    }
  };

  const handleContentChange = (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const moduleId = newRecord?.module_id || oldRecord?.module_id;
    
    if (!moduleId) return;
    
    switch (eventType) {
      case 'INSERT':
        setModuleContent(prev => ({
          ...prev,
          [moduleId]: [...(prev[moduleId] || []), newRecord]
        }));
        break;
        
      case 'UPDATE':
        setModuleContent(prev => ({
          ...prev,
          [moduleId]: (prev[moduleId] || []).map(content => 
            content.id === newRecord.id ? newRecord : content
          )
        }));
        break;
        
      case 'DELETE':
        setModuleContent(prev => ({
          ...prev,
          [moduleId]: (prev[moduleId] || []).filter(content => 
            content.id !== oldRecord.id
          )
        }));
        break;
    }
  };

  const loadModules = async () => {
    try {
      console.log('Loading modules...');
      const { data, error } = await supabase
        .from('modules')
        .select('id, name, description, content_summary, is_global, created_at, suggested_questions')
        .eq('is_global', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Loaded modules:', data?.length || 0);
      setModules(data || []);

      // Load content for each module
      for (const module of data || []) {
        await loadModuleContent(module.id);
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadModuleContent = async (moduleId) => {
    try {
      console.log(`Loading content for module ${moduleId}...`);
      
      // First try to get content from module_content table
      const { data: moduleContentData, error: moduleContentError } = await supabase
        .from('module_content')
        .select('*')
        .eq('module_id', moduleId)
        .order('upload_date', { ascending: false });

      if (moduleContentError) {
        console.error('Error fetching from module_content:', moduleContentError);
        throw moduleContentError;
      }
      
      console.log(`Found ${moduleContentData?.length || 0} files in module_content table`);
      
      // Also check processed_documents table for any documents linked to this module
      const { data: processedDocsData, error: processedDocsError } = await supabase
        .from('processed_documents')
        .select('*')
        .eq('course_id', moduleId)
        .order('created_at', { ascending: false });
        
      if (processedDocsError) {
        console.error('Error fetching from processed_documents:', processedDocsError);
        throw processedDocsError;
      }
      
      console.log(`Found ${processedDocsData?.length || 0} files in processed_documents table`);
      
      // Convert processed_documents to module_content format if needed
      const processedDocsAsContent = (processedDocsData || []).map(doc => ({
        id: doc.id,
        module_id: moduleId,
        file_name: doc.original_filename,
        file_type: doc.metadata?.file_type || 'application/octet-stream',
        file_size: doc.metadata?.file_size || 0,
        processed_content: doc.processed_text,
        processing_status: 'completed',
        upload_date: doc.created_at,
        document_id: doc.id,
        llm_whisperer_id: doc.llm_whisperer_id
      }));
      
      // Combine both sources, avoiding duplicates (prefer module_content entries)
      const processedDocIds = new Set(moduleContentData?.map(item => item.document_id) || []);
      const uniqueProcessedDocs = processedDocsAsContent.filter(doc => 
        !processedDocIds.has(doc.document_id)
      );
      
      const combinedContent = [...(moduleContentData || []), ...uniqueProcessedDocs];
      console.log(`Combined total: ${combinedContent.length} files`);
      
      setModuleContent(prev => ({ ...prev, [moduleId]: combinedContent }));
    } catch (error) {
      console.error('Error loading module content:', error);
    }
  };

  const setActiveModuleId = async (moduleId) => {
    try {
      // Use the hook's function to set the active module
      // This will update the database and local state in one go
      const success = await setGlobalActiveModule(moduleId);
      
      if (!success) throw new Error('Failed to update active module');
      
      // Toast notification is already handled by the hook
    } catch (error) {
      console.error('Error updating active module:', error);
      toast.error('Failed to update active course');
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      // Use the refreshActiveModule that's already available from the component scope
      await Promise.all([loadModules(), refreshActiveModule()]);
      toast.success('Courses refreshed successfully');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh courses');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const updateModuleQuestions = async (moduleId, newQuestions) => {
    try {
      // Get current module
      const module = modules.find(m => m.id === moduleId);
      if (!module) return;

      // Combine existing questions with new ones, remove duplicates
      const existingQuestions = module.suggested_questions || [];
      const combinedQuestions = [...existingQuestions, ...newQuestions];
      const uniqueQuestions = Array.from(new Set(combinedQuestions)).slice(0, 20);

      const { error } = await supabase
        .from('modules')
        .update({ suggested_questions: uniqueQuestions })
        .eq('id', moduleId);

      if (error) throw error;

      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId 
          ? { ...m, suggested_questions: uniqueQuestions }
          : m
      ));

      console.log(`Updated module ${moduleId} with ${uniqueQuestions.length} suggested questions`);
    } catch (error) {
      console.error('Error updating module questions:', error);
    }
  };

  const handleFileUpload = async (moduleId, file) => {
    setUploading(prev => ({ ...prev, [moduleId]: true }));
    
    let contentRecord = null;
    
    try {
      console.log('Starting file upload process...');
      
      const { data: contentData, error: insertError } = await supabase
        .from('module_content')
        .insert({
          module_id: moduleId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      contentRecord = contentData;

      console.log('Content record created, processing file...');
      
      const fileProcessor = new FileProcessor(); // Instantiate FileProcessor
      // Pass moduleId as the courseId argument to processFile
      const processedContent = await fileProcessor.processFile(file, () => {}, moduleId); 
      
      console.log('File processed, extracted text length:', processedContent.text.length);
      console.log('Generated questions:', processedContent.suggestedQuestions?.length || 0);

      // Update module with new suggested questions
      if (processedContent.suggestedQuestions && processedContent.suggestedQuestions.length > 0) {
        await updateModuleQuestions(moduleId, processedContent.suggestedQuestions);
      }

      const { data: functionResult, error: functionError } = await supabase.functions.invoke('process-module-content', {
        body: {
          contentId: contentRecord.id,
          extractedText: processedContent.text,
          metadata: processedContent.metadata,
          useAI: false // Simplified processing without AI enhancement
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Processing function failed');
      }

      if (!functionResult?.success) {
        throw new Error(functionResult?.error || 'Processing failed');
      }

      // Real-time updates will handle the UI refresh automatically
      toast.success('File uploaded and processed successfully');
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to process file: ${error.message}`);
      
      if (contentRecord?.id) {
        await supabase
          .from('module_content')
          .update({ processing_status: 'failed' })
          .eq('id', contentRecord.id);
      }
    } finally {
      setUploading(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const deleteFile = async (fileId, moduleId) => {
    try {
      const { error } = await supabase
        .from('module_content')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      
      // Real-time updates will handle the UI refresh
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      if (activeModule === moduleId) {
        await setActiveModuleId(null);
      }
      
      // Real-time updates will handle the UI refresh
      toast.success('Course deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete course');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Add effect to refresh modules when tab is clicked (refreshTrigger changes)
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Set refreshing state to show the spinner
      setRefreshing(true);
      
      // Refresh modules
      loadModules().finally(() => {
        setRefreshing(false);
      });
    }
  }, [refreshTrigger]);
  
  // Instead of showing a loading message, we'll render the UI with loading indicators
  // This provides a better user experience when switching tabs

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#0fcabb]">Course Management</h2>
        <div className="flex gap-3">
          <Button
            onClick={manualRefresh}
            variant="ghost"
            className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <UploadModal onSaveSuccess={manualRefresh} />
        </div>
      </div>

      {/* Global Active Module Selection */}
      <GlobalModuleSelector modules={modules} />

      {/* Module Cards */}
      <div className="space-y-4">
        {modules.map(module => (
          <Card key={module.id} className="bg-[#064646] border-[#0fcabb]/30 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <Collapsible 
              open={expandedModules.has(module.id)} 
              onOpenChange={() => toggleModuleExpansion(module.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#0fcabb]/5 transition-colors">
                  <CardTitle className="text-[#0fcabb] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{module.name}</span>
                      {activeModule?.id === module.id && (
                        <span className="px-3 py-1 bg-[#0fcabb] text-[#022222] text-xs rounded-full font-medium shadow-sm">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#72f0df] font-normal bg-[#022222] px-2 py-1 rounded">
                          {moduleContent[module.id]?.length || 0} files
                        </span>
                        {module.suggested_questions && module.suggested_questions.length > 0 && (
                          <span className="text-xs text-[#0fcabb] bg-[#0fcabb]/10 px-2 py-1 rounded">
                            {module.suggested_questions.length} questions
                          </span>
                        )}
                        <span className="text-xs text-[#72f0df]/60 bg-[#022222] px-2 py-1 rounded">
                          ID: {module.id.slice(0, 8)}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-[#72f0df] transition-transform ${
                          expandedModules.has(module.id) ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Course Description */}
                    {module.description && (
                      <div className="p-4 bg-[#022222] rounded-lg border border-[#0fcabb]/20">
                        <p className="text-[#72f0df] text-sm leading-relaxed">{module.description}</p>
                      </div>
                    )}

                    {/* File Upload Area */}
                    <div>
                      <Label className="text-[#72f0df] mb-3 block text-sm font-medium">Upload Additional Files</Label>
                      <div className="border-2 border-dashed border-[#0fcabb]/30 rounded-xl p-8 text-center hover:border-[#0fcabb]/50 transition-colors bg-[#022222]">
                        <input
                          type="file"
                          id={`file-${module.id}`}
                          className="hidden"
                          accept=".pdf,.txt,.md,.docx,.doc,.ppt,.pptx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(module.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                        <label
                          htmlFor={`file-${module.id}`}
                          className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <Upload className="w-10 h-10 text-[#0fcabb]/70" />
                          <span className="text-[#72f0df] font-medium">
                            {uploading[module.id] ? 'Uploading...' : 'Click to upload files'}
                          </span>
                          <span className="text-[#72f0df]/70 text-sm">
                            PDF, TXT, MD, DOCX, DOC, PPT, PPTX
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Files List */}
                    {moduleContent[module.id] && moduleContent[module.id].length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-[#72f0df] text-sm font-medium">Uploaded Files</h4>
                        <div className="bg-[#022222] rounded-lg overflow-hidden">
                          <div className="divide-y divide-[#0fcabb]/10">
                            {moduleContent[module.id].map(file => (
                              <div key={file.id} className="p-3 flex items-center justify-between hover:bg-[#033333]">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-[#0fcabb]/70" />
                                  <div>
                                    <p className="text-[#72f0df] text-sm font-medium">{file.file_name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[#72f0df]/70 text-xs">
                                        {new Date(file.upload_date).toLocaleDateString()}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {getStatusIcon(file.processing_status)}
                                        <span className="text-xs text-[#72f0df]/70 capitalize">
                                          {file.processing_status || 'pending'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteFile(file.id, module.id)}
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#72f0df]/70 text-sm italic">No files uploaded yet</p>
                    )}

                    {/* Module Actions */}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteModule(module.id)}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500"
                      >
                        Delete Course
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModuleManagement;
