
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Brain } from 'lucide-react';

const MessageList = ({
  messages,
  status,
  isLoading,
  inputRef
}) => {
  const [renderedMessages, setRenderedMessages] = useState([]);
  const messagesContainerRef = useRef(null);
  const firstMessageRef = useRef(null);
  const { user } = useAuth();
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Get user's full name from user_metadata
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const welcomeMessage = `What can I help with?`;
  
  // Realistic typing animation effect for welcome message
  useEffect(() => {
    if (renderedMessages.length === 0 && !isLoading) {
      setIsTyping(true);
      let i = 0;
      let lastTypingTime = Date.now();
      
      // Generate consistent typing speeds for each character
      const charSpeeds = welcomeMessage.split('').map(() => {
        // Base speed between 30-60ms for natural variation without pauses
        return Math.floor(Math.random() * 30) + 30;
      });
      
      // Use requestAnimationFrame for smoother animation
      const animateTyping = () => {
        const now = Date.now();
        const elapsed = now - lastTypingTime;
        
        if (i < welcomeMessage.length) {
          // If enough time has passed for this character
          if (elapsed >= charSpeeds[i]) {
            setTypingText(welcomeMessage.substring(0, i + 1));
            i++;
            lastTypingTime = now;
          }
          requestAnimationFrame(animateTyping);
        } else {
          setIsTyping(false);
        }
      };
      
      const animationFrame = requestAnimationFrame(animateTyping);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [renderedMessages.length, isLoading, welcomeMessage]);

  // Process messages to ensure all are properly displayed
  useEffect(() => {
    if (messages && messages.length > 0) {
      const processed = messages.map(msg => ({
        ...msg,
        content: msg.content || '',
        is_user: msg.is_user === true
      }));
      
      setRenderedMessages(processed);
      
      // Use multiple scroll techniques to ensure the first message is visible
      // Initial scroll to top
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
      
      // Set up multiple delayed scroll attempts to handle layout shifts
      const scrollAttempts = [100, 300, 600, 1000];
      
      scrollAttempts.forEach(delay => {
        setTimeout(() => {
          // Technique 1: Scroll container to top
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
          
          // Technique 2: Use scrollIntoView on first message if available
          if (firstMessageRef.current) {
            firstMessageRef.current.scrollIntoView({ 
              behavior: 'auto', 
              block: 'start'
            });
          }
        }, delay);
      });
    } else {
      setRenderedMessages([]);
    }
  }, [messages]);
  return (
    <div 
      className="flex-1 pb-12 pt-16" 
      ref={messagesContainerRef} 
      style={{ 
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none', /* Firefox */
        msOverflowStyle: 'none', /* IE and Edge */
        overflowY: renderedMessages.length > 0 ? 'auto' : 'hidden'
      }}>
    
      {/* Hide scrollbar for Chrome, Safari and Opera */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Fixed width container to prevent chat bubbles from moving */}
      <div className="max-w-2xl mx-auto space-y-3 py-2" style={{ position: 'relative', zIndex: 10, minHeight: '100%' }}>
        {/* Subtle spacing element at top */}
        <div className="h-2"></div>
        {/* Welcome message with typing animation when no messages */}
        {renderedMessages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center">
            <div className="max-w-md w-full mt-[-80px]">
              {/* Brain icon centered */}
              <div className="flex justify-center mb-6">
                <Brain size={48} className="text-[#0fcabb]" />
              </div>
              
              {/* Simple greeting with user name */}
              <h2 className="text-[#0fcabb] text-2xl mb-8 font-mono">
                Hello, {fullName || 'Chris'}
              </h2>
              
              {/* Terminal-like message box */}
              <div className="bg-[#001a1a] border-b-2 border-[#0fcabb] py-5 px-6 mb-10">
                <div className="text-[#0fcabb] text-lg font-mono">
                  {typingText}
                  {isTyping && <span className="animate-blink">_</span>}
                </div>
              </div>
              
              {/* Simple divider */}
              <div className="w-16 h-0.5 bg-[#0fcabb] opacity-30 mx-auto"></div>
            </div>
            
            {/* Animation styles */}
            <style jsx>{`
              @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
              }
              .animate-blink {
                animation: blink 1s infinite;
              }
            `}</style>
          </div>
        )}
        
        {/* Ensure messages is always an array before mapping */}
        {Array.isArray(renderedMessages) && renderedMessages.map((message, index) => (
          <div 
            key={message.id} 
            className="space-y-2" 
            ref={index === 0 ? firstMessageRef : null}
          >
            {!message.is_user && message.question_context && (
              <div className="text-xs text-[#0fcabb] opacity-70 italic">
                Regarding: "{message.question_context}"
              </div>
            )}
            
            <div
              className={`py-2 px-3 rounded-lg ${
                message.is_user
                  ? 'bg-[#0fcabb33] ml-auto mr-0 w-fit max-w-xs text-right'
                  : 'bg-[#064646] ml-0 mr-auto w-fit max-w-md'
              } animate-in slide-in-from-bottom-2 duration-300`}
            >
              <div className="text-[#aef5eb] text-sm leading-relaxed">
                {message.is_user ? (
                  <div className="whitespace-pre-wrap break-words">{message.content.trim()}</div>
                ) : (
                  <ReactMarkdown 
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold text-[#0fcabb]">{children}</strong>,
                      em: ({ children }) => <em className="italic text-[#a0dad3]">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      code: ({ children }) => <code className="bg-[#0fcabb22] px-1 py-0.5 rounded text-[#0fcabb] font-mono text-xs">{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
              {!message.is_user && (
                <div className="text-xs text-[#0fcabb] mt-2 opacity-70">
                  Teaching Assistant
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading reasoning module has been removed */}
        
        {isLoading && !status.isProcessing && (
          <div className="bg-[#064646] mr-auto max-w-md p-3 rounded-lg">
            <div className="text-[#aef5eb] text-sm opacity-70 animate-pulse">
              Thinking of guiding questions...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageList;
