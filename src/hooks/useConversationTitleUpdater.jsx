
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useConversationTitleUpdater = () => {
  const [typingTitles, setTypingTitles] = useState({});
  const [isTyping, setIsTyping] = useState({});

  const generateConversationTitle = async (firstUserMessage, firstAiResponse) => {
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'Generate a short, descriptive title (3-5 words max) for this conversation based on the user\'s question and AI response. Return only the title, no extra text.'
            },
            {
              role: 'user',
              content: `User asked: "${firstUserMessage}"\n\nAI responded: "${firstAiResponse.slice(0, 200)}..."`
            }
          ]
        }
      });

      if (error) throw error;
      return data?.response || 'Discussion';
    } catch (error) {
      console.error('Error generating title:', error);
      return 'Discussion';
    }
  };

  const updateConversationTitle = async (conversationId, newTitle) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  };

  const startTypingAnimation = (conversationId, targetTitle, onComplete) => {
    setIsTyping(prev => ({ ...prev, [conversationId]: true }));
    setTypingTitles(prev => ({ ...prev, [conversationId]: '' }));

    let currentIndex = 0;
    const typeNextCharacter = () => {
      if (currentIndex < targetTitle.length) {
        setTypingTitles(prev => ({
          ...prev,
          [conversationId]: targetTitle.slice(0, currentIndex + 1)
        }));
        currentIndex++;
        setTimeout(typeNextCharacter, 50); // 50ms delay between characters
      } else {
        setIsTyping(prev => ({ ...prev, [conversationId]: false }));
        // Keep the final title in state permanently
        setTypingTitles(prev => ({
          ...prev,
          [conversationId]: targetTitle
        }));
        
        // Call the completion callback to update the conversation state
        if (onComplete) {
          onComplete(targetTitle);
        }
      }
    };

    typeNextCharacter();
  };

  const processFirstAiResponse = async (
    conversationId,
    firstUserMessage,
    firstAiResponse,
    onTitleUpdate
  ) => {
    
    // Generate new title in background
    const newTitle = await generateConversationTitle(firstUserMessage, firstAiResponse);
    
    // Update database
    await updateConversationTitle(conversationId, newTitle);
    
    // Start typing animation with completion callback
    startTypingAnimation(conversationId, newTitle, (finalTitle) => {
      // Update the conversation state immediately when animation completes
      if (onTitleUpdate) {
        onTitleUpdate(finalTitle);
      }
    });
  };

  // Helper function to get the current title (either typing or final)
  const getCurrentTitle = (conversationId, fallbackTitle) => {
    if (typingTitles[conversationId]) {
      return typingTitles[conversationId];
    }
    return fallbackTitle;
  };

  return {
    typingTitles,
    isTyping,
    processFirstAiResponse,
    getCurrentTitle
  };
};
