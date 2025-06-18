import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { FileText, Trash2, Eye, Calendar, Book } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.js';
import { format } from 'date-fns';

const CourseDocumentsList = ({ courseId, isTeacher = false }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [courseId]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('processed_documents')
        .select('*')
        .eq('course_id', courseId);

      // If not a teacher, only show approved documents
      if (!isTeacher) {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('processed_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }

      // Remove the document from the list
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const handleViewDocument = (document) => {
    // Implementation depends on your application's document viewing approach
    // This could open a modal, navigate to a document viewer page, etc.
    console.log('View document:', document);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#0fcabb] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[#72f0df]">Loading course documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-300 mb-2">Failed to load documents</p>
        <p className="text-red-200/80 text-sm">{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-[#0fcabb]/30 rounded-lg">
        <Book className="h-12 w-12 mx-auto mb-4 text-[#0fcabb]/40" />
        <p className="text-[#aef5eb] mb-2">No course materials available</p>
        {isTeacher && (
          <p className="text-[#72f0df]/70 text-sm">
            Upload documents to provide context for students using the AI.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((document) => (
        <Card key={document.id} className="bg-[#064646] border-[#0fcabb]/30 text-[#aef5eb]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#0fcabb] text-lg line-clamp-2">
              {document.title || document.original_filename}
            </CardTitle>
            <CardDescription className="text-[#72f0df]/70 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              {document.original_filename}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-[#aef5eb]/90 line-clamp-3 mb-3">
              {document.description || "No description available"}
            </p>
            <div className="flex items-center text-xs text-[#72f0df]/70">
              <Calendar className="h-3 w-3 mr-1" />
              {document.created_at ? format(new Date(document.created_at), 'MMM d, yyyy') : 'Unknown date'}
            </div>
          </CardContent>
          
          <CardFooter className="pt-2 border-t border-[#0fcabb]/20 flex justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#72f0df] hover:text-[#aef5eb] hover:bg-[#0fcabb]/20"
              onClick={() => handleViewDocument(document)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {isTeacher && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => handleDeleteDocument(document.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default CourseDocumentsList;
