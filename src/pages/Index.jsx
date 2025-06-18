
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useConversationTitleUpdater } from '@/hooks/useConversationTitleUpdater';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useUIState } from '@/hooks/useUIState';
import { useGlobalActiveModule } from '@/hooks/useGlobalActiveModule';
import ConversationSidebar from '@/components/ConversationSidebar';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import TopNavigation from '@/components/TopNavigation';

const Index = () => {
  const [input, setInput] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { typingTitles, isTyping, processFirstAiResponse, getCurrentTitle } = useConversationTitleUpdater();

  // Use the global active module hook instead of local state
  const { activeModule, loading: moduleLoading } = useGlobalActiveModule();

  const {
    modules,
    conversations,
    messages,
    currentConversation,
    loading: conversationsLoading,
    setCurrentConversation,
    setMessages,
    setConversations,
    loadMessages,
    createConversation,
    addMessage,
    getConversationContext,
    deleteConversation,
    updateConversationTitle
  } = useConversations();

  const {
    showHeader,
    setShowHeader,
    sidebarVisible,
    isConfirmationOpen,
    setIsConfirmationOpen,
    messagesEndRef,
    inputRef,
    sidebarRef,
    scrollToBottom,
    cancelHideSidebar,
    hideSidebar
  } = useUIState();

  const {
    sendToAI,
    isLoading,
    status,
    firstResponseTracker,
    setFirstResponseTracker
  } = useMessageHandling({
    activeModule,
    currentConversation,
    messages,
    getConversationContext,
    addMessage,
    updateConversationTitle,
    processFirstAiResponse,
    setCurrentConversation,
    setConversations
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowHeader(false);
    }
  }, [messages, setShowHeader]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleNewConversation = async () => {
    if (currentConversation && messages.length === 0) {
      setShowHeader(true);
      inputRef.current?.focus();
      // Dismiss all existing toasts before showing a new one
      toast.dismiss();
      toast.info('Start typing to begin your conversation!', {
        style: {
          background: '#022222',
          color: '#72f0df',
          border: '1px solid #0fcabb',
          fontFamily: 'monospace',
          borderRadius: '4px',
          padding: '12px'
        },
        icon: '⚠️',
        autoClose: 3
      });
      return currentConversation;
    }

    const title = activeModule 
      ? `${activeModule.name} Discussion ${new Date().toLocaleDateString()}`
      : `General Discussion ${new Date().toLocaleDateString()}`;
    
    const conversation = await createConversation(title, activeModule?.id);
    if (conversation) {
      setCurrentConversation(conversation);
      setMessages([]);
      setShowHeader(true);
      setFirstResponseTracker(prev => ({ ...prev, [conversation.id]: false }));
    }
    return conversation;
  };

  const handleSelectConversation = async (conversation) => {
    console.log('Selecting conversation:', conversation);
    setCurrentConversation(conversation);
    setShowHeader(false);
    
    try {
      // First clear the messages to avoid any stale data
      setMessages([]);
      
      // Direct database query to ensure we get ALL messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages directly:', error);
        throw error;
      }
      
      console.log('Direct DB query found messages:', data?.length || 0);
      
      if (data && data.length > 0) {
        // Log each message for debugging
        data.forEach((msg, index) => {
          console.log(`Message ${index}:`, msg.is_user ? 'User' : 'AI', 
            msg.content ? msg.content.substring(0, 30) : 'No content');
        });
        
        // Ensure all messages are properly processed
        const processedMessages = data.map(msg => ({
          ...msg,
          content: msg.content || '',
          is_user: msg.is_user === true
        }));
        
        // Set messages directly from DB query
        setMessages(processedMessages);
        
        // Force a re-render after a short delay to ensure UI updates
        setTimeout(() => {
          setMessages([...processedMessages]);
        }, 100);
      } else {
        console.log('No messages found for conversation:', conversation.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast.error('Failed to load conversation messages');
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    await deleteConversation(conversationId);
  };

  const proceedWithMessage = async (userMessage) => {
    let conversationToUse = currentConversation;
    
    if (!conversationToUse) {
      conversationToUse = await handleNewConversation();
      if (!conversationToUse) {
        toast.error('Failed to create conversation');
        return;
      }
    }

    await addMessage(conversationToUse.id, userMessage, true);
    await sendToAI(userMessage, conversationToUse.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    await proceedWithMessage(userMessage);
  };

  const handleHintMe = async () => {
    if (!messages.length) {
      toast.dismiss();
      toast.error('Please ask a question first, then I can provide a hint!', {
        style: {
          background: '#022222',
          color: '#72f0df',
          border: '1px solid #0fcabb',
          fontFamily: 'monospace',
          borderRadius: '4px',
          padding: '12px'
        },
        icon: '⚠️',
        autoClose: 2
      });
      return;
    }
    
    let conversationToUse = currentConversation;
    if (!conversationToUse) {
      conversationToUse = await handleNewConversation();
      if (!conversationToUse) {
        toast.error('Failed to create conversation');
        return;
      }
    }
    
    const lastUserMessage = messages.filter(m => m.is_user).pop();
    const contextQuestion = lastUserMessage?.content || "your previous question";
    
    const displayMessage = "Can you give me a hint about my previous question to help guide my thinking?";
    
    const timestamp = Date.now();
    const hintCount = messages.filter(m => m.is_user && m.content.includes('hint')).length + 1;
    const aiMessage = `Can you give me hint #${hintCount} about my previous question to help guide my thinking? (Request ID: ${timestamp})`;
    
    await addMessage(conversationToUse.id, displayMessage, true);
    await sendToAI(aiMessage, conversationToUse.id, `Context: "${contextQuestion}" - This is hint request #${hintCount}`);
  };

  const handleBuildQuestion = async () => {
    const buildMessage = activeModule 
      ? `I'm having trouble formulating my question clearly about ${activeModule.name}. Can you help me think through what I'm trying to understand and ask better questions?`
      : "I'm having trouble formulating my question clearly. Can you help me think through what I'm trying to understand and ask better questions?";
    
    let conversationToUse = currentConversation;
    if (!conversationToUse) {
      conversationToUse = await handleNewConversation();
      if (!conversationToUse) {
        toast.error('Failed to create conversation');
        return;
      }
    }
    
    await addMessage(conversationToUse.id, buildMessage, true);
    await sendToAI(buildMessage, conversationToUse.id, "Question formulation help");
  };

  if (authLoading || conversationsLoading || moduleLoading) {
    return (
      <div className="min-h-screen bg-[#022222] text-[#72f0df] font-mono flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get the display title - prioritize the actual conversation title over typing animation
  const displayTitle = currentConversation 
    ? (getCurrentTitle(currentConversation.id, currentConversation.title) || currentConversation.title)
    : null;

  return (
    <div className="min-h-screen bg-[#022222] text-[#72f0df] font-mono relative">
      {/* Sidebar positioned absolutely to overlay content */}
      <div ref={sidebarRef} className="absolute top-0 left-0 z-20 h-full">
        <ConversationSidebar
          modules={modules}
          conversations={conversations}
          currentConversation={currentConversation}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isVisible={sidebarVisible}
          typingTitles={typingTitles}
          isTyping={isTyping}
          onMouseEnter={cancelHideSidebar}
          onMouseLeave={hideSidebar}
          setIsConfirmationOpen={setIsConfirmationOpen}
        />
      </div>

      {/* Top navigation that gets pushed out */}
      <div className="transition-all duration-150 ease-out" style={{marginLeft: sidebarVisible ? '20rem' : '2rem'}}>
        <TopNavigation 
          currentConversation={currentConversation ? { ...currentConversation, title: displayTitle } : null}
          activeModule={activeModule}
        />
      </div>

      {/* Chat content area */}
      <div className="flex flex-col min-h-screen pb-[180px] absolute inset-0 pt-16 z-10">
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList 
            messages={messages}
            status={status}
            isLoading={isLoading}
            inputRef={inputRef}
          />
          
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onHintMe={handleHintMe}
          onBuildQuestion={handleBuildQuestion}
          isLoading={isLoading}
          activeModule={activeModule}
          inputRef={inputRef}
          sidebarVisible={sidebarVisible}
        />
      </div>
    </div>
  );
};

export default Index;
