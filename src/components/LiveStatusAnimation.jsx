
import React, { useState, useEffect } from 'react';

const LiveStatusAnimation = ({ isActive, currentStep, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    let charIndex = 0;
    setDisplayedText('');

    const typeInterval = setInterval(() => {
      if (charIndex < currentStep.length) {
        setDisplayedText(currentStep.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 30); // Faster typing speed

    return () => clearInterval(typeInterval);
  }, [currentStep, isActive]);

  useEffect(() => {
    if (!isActive && onComplete) {
      onComplete();
    }
  }, [isActive, onComplete]);

  if (!isActive || !currentStep) return null;

  return (
    <div className="bg-[#064646] mr-auto max-w-md p-3 rounded-lg border border-[#0fcabb]/30 animate-in slide-in-from-bottom-2 duration-300">
      <div className="text-[#aef5eb] text-sm opacity-90 min-h-[1.5rem] flex items-center">
        <span className="mr-2 animate-pulse">🤔</span>
        <span>
          {displayedText}
          {isTyping && (
            <span className="ml-1 animate-pulse text-[#0fcabb] font-bold">
              |
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default LiveStatusAnimation;
