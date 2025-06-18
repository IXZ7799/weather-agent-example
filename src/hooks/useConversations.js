
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useConversations = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadModules = async () => {
    if (!user) {
      console.log('No user available for loading modules');
      return;
    }
    
    try {
      console.log('Loading modules for user:', user.id);
      
      // Use the RLS policy - it will automatically filter by user_id and include global modules
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading modules:', error);
        throw error;
      }
      
      console.log('Modules loaded successfully:', data?.length || 0);
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Failed to load modules');
    }
  };

  const loadConversations = async () => {
    if (!user) {
      console.log('No user available for loading conversations');
      return;
    }
    
    try {
      console.log('Loading conversations for user:', user.id);
      
      // Use the RLS policy - it will automatically filter by user_id
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        throw error;
      }
      
      console.log('Conversations loaded successfully:', data?.length || 0);
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const loadMessages = async (conversationId) => {
    if (!user) return;
    
    try {
      console.log('Loading messages for conversation:', conversationId);
      
      // First clear the messages to avoid any stale data
      setMessages([]);
      
      // Use a direct database query with explicit ordering to ensure all messages are loaded
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }
      
      console.log('Messages loaded successfully:', data?.length || 0);
      
      // Ensure all messages are properly processed before setting state
      if (data && data.length > 0) {
        // Log each message for debugging
        data.forEach((msg, index) => {
          console.log(`Message ${index}:`, msg.is_user ? 'User' : 'AI', 
            msg.content ? msg.content.substring(0, 30) : 'No content');
        });
        
        // Process messages to ensure they're all properly formatted
        const processedMessages = data.map(msg => ({
          ...msg,
          content: msg.content || '',  // Ensure content is never null
          is_user: msg.is_user === true  // Ensure is_user is a boolean
        }));
        
        // Set messages and force a re-render
        setMessages(processedMessages);
        
        // Force another update after a short delay to ensure UI updates
        setTimeout(() => {
          setMessages([...processedMessages]);
        }, 100);
      } else {
        console.log('No messages found for conversation:', conversationId);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const createModule = async (name, code, description) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          user_id: user.id,
          name,
          code: code || null,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;
      setModules(prev => [...prev, data]);
      toast.success('Module created successfully');
      return data;
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module');
      return null;
    }
  };

  const createConversation = async (title, moduleId) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          module_id: moduleId || null
        })
        .select()
        .single();

      if (error) throw error;
      setConversations(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  };

  const updateConversationTitle = (conversationId, newTitle) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title: newTitle }
          : conv
      )
    );
  };

  const switchToConversation = async (conversation, reason) => {
    if (!user) return false;
    
    try {
      setCurrentConversation(conversation);
      await loadMessages(conversation.id);
      
      if (reason) {
        toast.success(`Switched to related conversation`, {
          description: reason,
          duration: 3000
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error switching conversation:', error);
      toast.error('Failed to switch conversation');
      return false;
    }
  };

  const addMessage = async (conversationId, content, isUser, toolsUsed, questionContext) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          is_user: isUser,
          tools_used: toolsUsed || null,
          question_context: questionContext || null
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', conversationId);

      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      toast.error('Failed to add message');
      return null;
    }
  };

  const getConversationContext = (conversationId, limit = 10) => {
    return messages
      .filter(msg => msg.conversation_id === conversationId)
      .slice(-limit)
      .map(msg => ({
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.content
      }));
  };

  const deleteConversation = async (conversationId) => {
    if (!user) return false;
    
    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) throw messagesError;

      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (conversationError) throw conversationError;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast.success('Conversation deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      return false;
    }
  };

  const getAllMessages = async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(user_id)
        `)
        .eq('conversations.user_id', user.id)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading all messages:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User authenticated, loading data...');
      Promise.all([loadModules(), loadConversations()]).finally(() => {
        setLoading(false);
      });
    } else {
      console.log('No user, skipping data load');
      setLoading(false);
    }
  }, [user]);

  return {
    modules,
    conversations,
    messages,
    currentConversation,
    loading,
    setCurrentConversation,
    setMessages,
    setConversations,
    loadMessages,
    createModule,
    createConversation,
    addMessage,
    getConversationContext,
    loadModules,
    loadConversations,
    switchToConversation,
    deleteConversation,
    getAllMessages,
    updateConversationTitle
  };
};
