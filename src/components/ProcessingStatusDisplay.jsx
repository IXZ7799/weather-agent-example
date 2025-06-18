
import React from 'react';
import { Progress } from '@/components/ui/progress.jsx';
import { CheckCircle, Loader2, AlertTriangle, FileText, Brain, Zap, HelpCircle, Shield } from 'lucide-react';

const ProcessingStatusDisplay = ({ 
  status,
  fileName = '',
  onCancel 
}) => {
  const { isProcessing, currentStep, progress } = status;

  if (!isProcessing && progress !== 100) return null;

  const getStageIcon = (stepText) => {
    const lowerStep = stepText.toLowerCase();
    
    if (lowerStep.includes('fallback') || lowerStep.includes('enhanced')) {
      return <Shield className="w-4 h-4 text-[#0fcabb]" />;
    }
    if (lowerStep.includes('extraction') || lowerStep.includes('reading')) {
      return <FileText className="w-4 h-4 text-[#0fcabb]" />;
    }
    if (lowerStep.includes('enhancement') || lowerStep.includes('ai')) {
      return <Brain className="w-4 h-4 text-[#0fcabb]" />;
    }
    if (lowerStep.includes('analysis')) {
      return <Zap className="w-4 h-4 text-[#0fcabb]" />;
    }
    if (lowerStep.includes('question')) {
      return <HelpCircle className="w-4 h-4 text-[#0fcabb]" />;
    }
    
    return progress === 100 
      ? <CheckCircle className="w-4 h-4 text-[#0fcabb]" />
      : <Loader2 className="w-4 h-4 animate-spin text-[#0fcabb]" />;
  };

  const getQualityIndicator = () => {
    if (progress < 25) return { color: 'text-[#72f0df]', label: 'Initializing...' };
    if (progress < 50) return { color: 'text-[#aef5eb]', label: 'Extracting...' };
    if (progress < 75) return { color: 'text-[#0fcabb]', label: 'Enhancing...' };
    if (progress < 100) return { color: 'text-[#0fcabb]', label: 'Finalizing...' };
    return { color: 'text-[#0fcabb]', label: 'Complete!' };
  };

  const qualityIndicator = getQualityIndicator();

  return (
    <div className="bg-[#064646] p-6 rounded-xl border border-[#0fcabb]/30 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStageIcon(currentStep)}
          <div>
            <h3 className="text-[#0fcabb] font-medium">Intelligent File Processing</h3>
            {fileName && (
              <p className="text-[#72f0df]/70 text-sm">{fileName}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${qualityIndicator.color}`}>
            {qualityIndicator.label}
          </div>
          <div className="text-xs text-[#72f0df]/70">
            Adaptive Processing
          </div>
        </div>
      </div>

      {/* Current Stage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[#aef5eb] text-sm">{currentStep}</p>
          <span className="text-xs text-[#72f0df]/70">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <Progress 
          value={progress} 
          className="h-3 bg-[#022222] border border-[#0fcabb]/20"
        />
      </div>

      {/* Processing Stages */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        {[
          { name: 'Extract', icon: FileText, min: 0, max: 25 },
          { name: 'Enhance', icon: Brain, min: 25, max: 50 },
          { name: 'Analyze', icon: Zap, min: 50, max: 75 },
          { name: 'Questions', icon: HelpCircle, min: 75, max: 100 }
        ].map((stage, index) => {
          const isActive = progress >= stage.min && progress < stage.max;
          const isComplete = progress >= stage.max;
          const Icon = stage.icon;
          
          return (
            <div 
              key={index}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-[#0fcabb]/20 border border-[#0fcabb]/40' 
                  : isComplete
                    ? 'bg-[#0fcabb]/10 border border-[#0fcabb]/20'
                    : 'bg-[#022222] border border-[#72f0df]/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${
                isActive 
                  ? 'text-[#0fcabb] animate-pulse' 
                  : isComplete 
                    ? 'text-[#0fcabb]' 
                    : 'text-[#72f0df]/40'
              }`} />
              <span className={`text-xs ${
                isActive 
                  ? 'text-[#0fcabb] font-medium' 
                  : isComplete 
                    ? 'text-[#0fcabb]' 
                    : 'text-[#72f0df]/60'
              }`}>
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* System Info */}
      {progress < 100 && (
        <div className="text-xs text-[#72f0df]/60 bg-[#022222] p-3 rounded border border-[#0fcabb]/10">
          🛡️ <strong>Adaptive Processing:</strong> Intelligent fallback system ensures successful extraction even if primary methods encounter issues. Your content will be processed reliably.
        </div>
      )}
    </div>
  );
};

export default ProcessingStatusDisplay;
