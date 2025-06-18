
import { useState, useCallback } from 'react';

export const useAIProcessingStatus = () => {
  const [status, setStatus] = useState({
    isProcessing: false,
    currentStep: '',
    progress: 0
  });

  const updateStatus = useCallback((newStatus) => {
    setStatus(prev => ({ ...prev, ...newStatus }));
  }, []);

  const startProcessing = useCallback((initialStep = "Starting analysis...") => {
    setStatus({
      isProcessing: true,
      currentStep: initialStep,
      progress: 0
    });
  }, []);

  const updateStep = useCallback((step, progress) => {
    setStatus(prev => ({
      ...prev,
      currentStep: step,
      progress: progress ?? prev.progress
    }));
  }, []);

  const completeProcessing = useCallback(() => {
    setStatus({
      isProcessing: false,
      currentStep: '',
      progress: 100
    });
  }, []);

  return {
    status,
    startProcessing,
    updateStep,
    completeProcessing,
    updateStatus
  };
};
