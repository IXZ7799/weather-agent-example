
import React from 'react';
import { Progress } from '@/components/ui/progress.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Loader2, FileText, Brain, Database, CheckCircle, ArrowLeft } from 'lucide-react';

const FileProcessingStatus = ({ 
  status,
  fileName = '',
  onCancel 
}) => {
  const { isProcessing, currentStep, progress, estimatedTimeRemaining, detailedSteps, currentStepIndex } = status;

  if (!isProcessing && progress !== 100) return null;

  const formatTimeRemaining = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `~${seconds}s remaining`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `~${minutes}m ${remainingSeconds}s remaining`;
  };

  const getStepIcon = (stepIndex) => {
    if (stepIndex < currentStepIndex) {
      return <CheckCircle className="w-4 h-4 text-[#0fcabb]" />;
    } else if (stepIndex === currentStepIndex) {
      return <Loader2 className="w-4 h-4 animate-spin text-[#0fcabb]" />;
    } else {
      return <div className="w-4 h-4 border border-[#72f0df]/30 rounded-full" />;
    }
  };

  const getCurrentIcon = () => {
    if (progress === 100) return <CheckCircle className="w-5 h-5 text-[#0fcabb]" />;
    if (currentStep.toLowerCase().includes('ai') || currentStep.toLowerCase().includes('gemini')) {
      return <Brain className="w-5 h-5 text-[#0fcabb] animate-pulse" />;
    }
    if (currentStep.toLowerCase().includes('database') || currentStep.toLowerCase().includes('saving')) {
      return <Database className="w-5 h-5 text-[#0fcabb] animate-pulse" />;
    }
    return <FileText className="w-5 h-5 text-[#0fcabb] animate-pulse" />;
  };

  return (
    <div className="bg-[#064646] p-6 rounded-xl border border-[#0fcabb]/30 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getCurrentIcon()}
          <div>
            <h3 className="text-[#0fcabb] font-medium">Processing Course Material</h3>
            {fileName && (
              <p className="text-[#72f0df]/70 text-sm">{fileName}</p>
            )}
          </div>
        </div>
        {onCancel && isProcessing && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Chat
          </Button>
        )}
      </div>

      {/* Current Step */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[#aef5eb] text-sm">{currentStep}</p>
          {estimatedTimeRemaining > 1000 && progress < 100 && (
            <span className="text-xs text-[#72f0df]/70">
              {formatTimeRemaining(estimatedTimeRemaining)}
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        <Progress 
          value={progress} 
          className="h-2 bg-[#022222] border border-[#0fcabb]/20"
        />
        <div className="flex justify-between text-xs text-[#72f0df]/70">
          <span>{Math.round(progress)}% complete</span>
          <span>Step {currentStepIndex + 1} of {detailedSteps.length}</span>
        </div>
      </div>

      {/* Detailed Steps */}
      {detailedSteps.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <h4 className="text-[#72f0df] text-xs font-medium border-t border-[#0fcabb]/20 pt-3">
            Processing Steps:
          </h4>
          <div className="space-y-1">
            {detailedSteps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  index < currentStepIndex 
                    ? 'text-[#0fcabb] opacity-80' 
                    : index === currentStepIndex 
                      ? 'text-[#aef5eb] opacity-100' 
                      : 'text-[#72f0df] opacity-50'
                }`}
              >
                {getStepIcon(index)}
                <span className="flex-1">{step}</span>
                {index < currentStepIndex && (
                  <span className="text-[#0fcabb]">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Note */}
      {progress < 30 && detailedSteps.length > 5 && (
        <div className="text-xs text-[#72f0df]/60 bg-[#022222] p-3 rounded border border-[#0fcabb]/10">
          💡 <strong>First-time processing:</strong> Building intelligent content analysis takes longer but enables faster future interactions with your course material.
        </div>
      )}
    </div>
  );
};

export default FileProcessingStatus;
