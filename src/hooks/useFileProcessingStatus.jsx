
import { useState, useCallback } from 'react';

export const useFileProcessingStatus = () => {
  const [status, setStatus] = useState({
    isProcessing: false,
    currentStep: '',
    progress: 0,
    detailedSteps: [],
    currentStepIndex: 0,
    estimatedTimeRemaining: 0,
    startTime: null,
    actualProgress: 0
  });

  const startProcessing = useCallback((operationType = 'instant-upload') => {
    const steps = ['Reading file...', 'Creating course...'];
    console.log('Starting instant file processing');
    
    setStatus({
      isProcessing: true,
      currentStep: steps[0],
      progress: 0,
      detailedSteps: steps,
      currentStepIndex: 0,
      startTime: Date.now(),
      estimatedTimeRemaining: 1000, // 1 second
      actualProgress: 0
    });
  }, []);

  const updateStep = useCallback((stepIndex, customMessage, additionalData = {}) => {
    setStatus(prev => {
      if (!prev.isProcessing) return prev;
      
      const steps = prev.detailedSteps;
      if (steps.length === 0) return prev;
      
      const validStepIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
      const baseProgress = (validStepIndex / steps.length) * 100;
      const actualProgress = additionalData.actualProgress || baseProgress;
      
      const currentStep = customMessage || steps[validStepIndex];
      
      return {
        ...prev,
        currentStep,
        progress: actualProgress,
        currentStepIndex: validStepIndex,
        actualProgress,
        ...additionalData
      };
    });
  }, []);

  const updateProgress = useCallback((progressPercent, message = null) => {
    setStatus(prev => {
      if (!prev.isProcessing) return prev;
      
      const clampedProgress = Math.max(0, Math.min(100, progressPercent));
      const currentStep = message || prev.currentStep;
      
      return {
        ...prev,
        progress: clampedProgress,
        actualProgress: clampedProgress,
        currentStep
      };
    });
  }, []);

  const completeProcessing = useCallback((finalMessage = 'Course created instantly!') => {
    console.log('Instant file processing completed');
    setStatus(prev => ({
      ...prev,
      isProcessing: false,
      currentStep: finalMessage,
      progress: 100,
      actualProgress: 100,
      estimatedTimeRemaining: 0
    }));
    
    setTimeout(() => {
      setStatus({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        detailedSteps: [],
        currentStepIndex: 0,
        estimatedTimeRemaining: 0,
        startTime: null,
        actualProgress: 0
      });
    }, 1500);
  }, []);

  const resetProcessing = useCallback(() => {
    setStatus({
      isProcessing: false,
      currentStep: '',
      progress: 0,
      detailedSteps: [],
      currentStepIndex: 0,
      estimatedTimeRemaining: 0,
      startTime: null,
      actualProgress: 0
    });
  }, []);

  return {
    status,
    startProcessing,
    updateStep,
    updateProgress,
    completeProcessing,
    resetProcessing
  };
};
