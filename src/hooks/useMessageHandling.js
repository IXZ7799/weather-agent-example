
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedAIStatus } from '@/hooks/useEnhancedAIStatus';

export const useMessageHandling = ({
  activeModule,
  currentConversation,
  messages,
  getConversationContext,
  addMessage,
  updateConversationTitle,
  processFirstAiResponse,
  setCurrentConversation,
  setConversations
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [firstResponseTracker, setFirstResponseTracker] = useState({});
  const { user } = useAuth();
  const { status, startProcessing, updateStep, completeProcessing } = useEnhancedAIStatus();

  const sendToAI = async (message, conversationId, context) => {
    if (!user) {
      toast.error('Unable to send message');
      return;
    }

    setIsLoading(true);
    
    const isFirstMessage = !currentConversation || messages.length === 0;
    const operationType = isFirstMessage ? 'initial_analysis' : 'follow_up';
    
    // Track when we started processing
    const startTime = Date.now();
    
    // Loading animation disabled as per user request
    let processingStarted = false;
    
    try {
      const conversationHistory = getConversationContext(conversationId, 8);
      
      // Keep the steps for logging purposes only
      const steps = getStepsForOperation(operationType);
      console.log('Starting AI processing with', steps.length, 'steps');
      
      // No loading animation will be shown
      
      console.log('Sending message to AI for processing:', message.substring(0, 100) + '...');
      console.log('Operation type:', operationType);

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: message
            }
          ],
          moduleId: activeModule?.id || null
        }
      });
      
      // Loading animation disabled as per user request
      // No timers to clear
      
      // Clear the progress interval if it was started
      if (window._progressIntervalID) {
        clearInterval(window._progressIntervalID);
        window._progressIntervalID = null;
      }

      if (error) {
        console.error('AI processing error:', error);
        throw new Error('Failed to get AI response');
      }

      if (data?.response) {
        console.log('AI response received and processed');
        
        // Only update step if we're showing the animation
        if (processingStarted) {
          updateStep(steps.length - 1, 'Finalizing AI response...');
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        

        
        await addMessage(conversationId, data.response, false, data.toolsUsed || [], context || message);
        
        const isFirstResponse = !firstResponseTracker[conversationId];
        if (isFirstResponse && processFirstAiResponse) {
          setFirstResponseTracker(prev => ({ ...prev, [conversationId]: true }));
          
          const firstUserMessage = getConversationContext(conversationId, 1000)
            .find(msg => msg.role === 'user')?.content || message;
          
          await processFirstAiResponse(
            conversationId,
            firstUserMessage,
            data.response,
            (newTitle) => {
              console.log('AI-generated title received:', newTitle);
              if (setCurrentConversation && currentConversation) {
                setCurrentConversation(prev => ({
                  ...prev,
                  title: newTitle
                }));
              }
              if (setConversations) {
                setConversations(prev => 
                  prev.map(conv => 
                    conv.id === conversationId 
                      ? { ...conv, title: newTitle }
                      : conv
                  )
                );
              }
              updateConversationTitle(newTitle);
            }
          );
        }
        
        // Only complete processing if we started showing the animation
        if (processingStarted) {
          completeProcessing();
        }
      } else {
        throw new Error('No response received from AI');
      }
    } catch (error) {
      console.error('Error in AI processing:', error);
      
      // Loading animation disabled as per user request
      // No timers to clear
      
      // Clear the progress interval if it was started
      if (window._progressIntervalID) {
        clearInterval(window._progressIntervalID);
      }
      
      // Only complete processing if we started showing the animation
      if (processingStarted) {
        completeProcessing();
      }
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendToAI,
    isLoading,
    status,
    firstResponseTracker,
    setFirstResponseTracker
  };
};

function getStepsForOperation(operation) {
  switch (operation) {
    case 'initial_analysis':
      return [
        'Loading course materials...',
        'AI analyzing document structure...',
        'AI extracting key concepts...',
        'AI building intelligent content map...',
        'AI identifying related topics...',
        'AI preparing contextual response...',
        'Finalizing AI analysis...'
      ];
    case 'follow_up':
      return [
        'AI checking context...',
        'AI finding relevant information...',
        'AI preparing response...'
      ];
    case 'caching':
      return [
        'AI processing course content...',
        'AI extracting subject areas...',
        'AI building concept map...',
        'Caching for faster AI access...'
      ];
    default:
      return ['AI processing...'];
  }
}
