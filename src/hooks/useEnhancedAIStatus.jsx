
import { useState, useCallback } from 'react';

export const useEnhancedAIStatus = () => {
  const [status, setStatus] = useState({
    isProcessing: false,
    currentStep: '',
    progress: 0,
    detailedSteps: [],
    currentStepIndex: 0
  });

  const startProcessing = useCallback((operation) => {
    const steps = getStepsForOperation(operation);
    console.log('Starting processing with steps:', steps);
    setStatus({
      isProcessing: true,
      currentStep: steps[0],
      progress: 0,
      detailedSteps: steps,
      startTime: Date.now(),
      estimatedTimeRemaining: getEstimatedTime(operation),
      currentStepIndex: 0
    });
  }, []);

  const updateStep = useCallback((stepIndex, customMessage) => {
    setStatus(prev => {
      if (!prev.isProcessing) return prev;
      
      const steps = prev.detailedSteps;
      if (steps.length === 0) {
        console.log('No steps available for update');
        return prev;
      }
      
      // Clamp stepIndex to valid range
      const validStepIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
      const progress = Math.min(((validStepIndex + 1) / steps.length) * 100, 100);
      const currentStep = customMessage || steps[validStepIndex];
      
      console.log(`Updating to step ${validStepIndex + 1}/${steps.length}: ${currentStep}, progress: ${progress}%`);
      
      // Calculate estimated time remaining
      let estimatedTimeRemaining;
      if (prev.startTime && validStepIndex > 0) {
        const elapsed = Date.now() - prev.startTime;
        const avgTimePerStep = elapsed / (validStepIndex + 1);
        const remainingSteps = steps.length - (validStepIndex + 1);
        estimatedTimeRemaining = Math.max(0, remainingSteps * avgTimePerStep);
      }
      
      return {
        ...prev,
        currentStep,
        progress,
        estimatedTimeRemaining,
        currentStepIndex: validStepIndex
      };
    });
  }, []);

  const completeProcessing = useCallback((finalMessage) => {
    console.log('Completing processing');
    setStatus(prev => ({
      ...prev,
      isProcessing: false,
      currentStep: finalMessage || 'Analysis complete',
      progress: 100,
      estimatedTimeRemaining: 0
    }));
    
    // Clear status after a short delay
    setTimeout(() => {
      setStatus({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        detailedSteps: [],
        currentStepIndex: 0
      });
    }, 2000);
  }, []);

  return {
    status,
    startProcessing,
    updateStep,
    completeProcessing
  };
};

function getStepsForOperation(operation) {
  switch (operation) {
    case 'initial_analysis':
      return [
        'Loading course materials...',
        'Analyzing document structure...',
        'Extracting key concepts and subjects...',
        'Building intelligent content cache...',
        'Identifying related topics...',
        'Preparing contextual response...',
        'Finalizing analysis...'
      ];
    case 'follow_up':
      return [
        'Checking cached context...',
        'Finding relevant information...',
        'Preparing response...'
      ];
    case 'caching':
      return [
        'Processing course content...',
        'Extracting subject areas...',
        'Building concept map...',
        'Caching for faster access...'
      ];
    default:
      return ['Processing...'];
  }
}

function getEstimatedTime(operation) {
  switch (operation) {
    case 'initial_analysis':
      return 15000; // 15 seconds
    case 'follow_up':
      return 3000; // 3 seconds
    case 'caching':
      return 8000; // 8 seconds
    default:
      return 5000; // 5 seconds
  }
}
