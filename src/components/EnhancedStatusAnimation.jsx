import React, { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress.jsx';

// Delay in milliseconds before showing the loading animation
const LOADING_DELAY = 1500; // 1.5 second delay

const EnhancedStatusAnimation = ({ 
  isActive, 
  currentStep, 
  progress = 0,
  estimatedTimeRemaining,
  detailedSteps = [],
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [shouldStayVisible, setShouldStayVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const timerRef = useRef(null);

  // Handle delayed display of the loading animation
  useEffect(() => {
    // Clear any existing timer when status changes
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (isActive) {
      // Set a timer to show the animation after delay
      timerRef.current = setTimeout(() => {
        // Only show if still active after the delay
        if (isActive) {
          setShouldShow(true);
        }
      }, LOADING_DELAY);
    } else {
      // Hide immediately when not active
      setShouldShow(false);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  // Smoothly update progress
  useEffect(() => {
    if ((!isActive && !shouldStayVisible) || !shouldShow) {
      setCurrentProgress(0);
      return;
    }

    const targetProgress = Math.min(progress, 100);
    
    if (targetProgress > currentProgress) {
      const increment = Math.max(1, (targetProgress - currentProgress) / 10);
      const timer = setInterval(() => {
        setCurrentProgress(prev => {
          const newProgress = prev + increment;
          if (newProgress >= targetProgress) {
            clearInterval(timer);
            return targetProgress;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(timer);
    } else {
      setCurrentProgress(targetProgress);
    }
  }, [progress, isActive, currentProgress, shouldStayVisible]);

  useEffect(() => {
    if ((!isActive && !shouldStayVisible) || !shouldShow) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    if (!currentStep) return;

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
    }, 30);

    return () => clearInterval(typeInterval);
  }, [currentStep, isActive, shouldStayVisible]);

  // Handle completion - stay visible longer
  useEffect(() => {
    if (!isActive && currentProgress === 100 && currentStep && shouldShow) {
      // Keep component visible for longer
      setShouldStayVisible(true);
      
      // Clear after showing completion for 3 seconds
      const clearTimer = setTimeout(() => {
        setShouldStayVisible(false);
        setShouldShow(false);
        setDisplayedText('');
        setCurrentProgress(0);
        if (onComplete) {
          onComplete();
        }
      }, 3000);

      return () => clearTimeout(clearTimer);
    } else if (!isActive && !shouldStayVisible) {
      // Reset everything when not active and not staying visible
      setShouldShow(false);
      setDisplayedText('');
      setCurrentProgress(0);
    }
  }, [isActive, currentProgress, currentStep, onComplete, shouldStayVisible, shouldShow]);

  const formatTimeRemaining = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `~${seconds}s remaining`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `~${minutes}m ${remainingSeconds}s remaining`;
  };

  if ((!isActive && !shouldStayVisible) || !shouldShow) return null;

  return (
    <div className="bg-[#064646] mr-auto max-w-lg p-4 rounded-lg border border-[#0fcabb]/30 animate-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-3">
        {/* Main status */}
        <div className="text-[#aef5eb] text-sm opacity-90 min-h-[1.5rem] flex items-center">
          <span className="mr-2 animate-pulse">
            {currentProgress === 100 ? '✅' : '🧠'}
          </span>
          <span className="flex-1">
            {displayedText}
            {isTyping && (
              <span className="ml-1 animate-pulse text-[#0fcabb] font-bold">
                |
              </span>
            )}
          </span>
          {currentProgress < 100 && estimatedTimeRemaining && estimatedTimeRemaining > 1000 && (
            <span className="text-xs text-[#72f0df] opacity-70 ml-2">
              {formatTimeRemaining(estimatedTimeRemaining)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress 
            value={currentProgress} 
            className="h-2 bg-[#022222] border border-[#0fcabb]/20"
          />
          <div className="flex justify-between text-xs text-[#72f0df] opacity-70">
            <span>{Math.round(currentProgress)}% complete</span>
            {currentProgress < 100 && detailedSteps.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="hover:text-[#0fcabb] transition-colors underline"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>
        </div>

        {/* Detailed steps */}
        {currentProgress < 100 && showDetails && detailedSteps.length > 0 && (
          <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
            <div className="text-xs text-[#72f0df] opacity-70 border-t border-[#0fcabb]/20 pt-2">
              Processing steps:
            </div>
            {detailedSteps.map((step, index) => {
              const stepProgress = ((index + 1) / detailedSteps.length) * 100;
              const isCompleted = stepProgress <= currentProgress;
              const isCurrent = Math.floor(currentProgress / (100 / detailedSteps.length)) === index;
              
              return (
                <div 
                  key={index}
                  className={`text-xs flex items-center space-x-2 ${
                    isCompleted 
                      ? 'text-[#0fcabb] opacity-80' 
                      : isCurrent 
                        ? 'text-[#aef5eb] opacity-90' 
                        : 'text-[#72f0df] opacity-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full border flex-shrink-0" 
                    style={{
                      backgroundColor: isCompleted ? '#0fcabb' : isCurrent ? '#aef5eb' : 'transparent',
                      borderColor: isCompleted || isCurrent ? 'currentColor' : '#72f0df'
                    }}
                  />
                  <span>{step}</span>
                  {isCompleted && <span className="text-[#0fcabb]">✓</span>}
                  {isCurrent && <span className="animate-pulse">⚡</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Performance note for first-time analysis */}
        {currentProgress < 50 && detailedSteps.length > 5 && (
          <div className="text-xs text-[#72f0df] opacity-60 bg-[#022222] p-2 rounded border border-[#0fcabb]/10">
            💡 First analysis takes longer as I'm building an intelligent cache of your course materials for faster future responses.
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedStatusAnimation;
