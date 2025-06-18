
import React from 'react';
import { BookOpen } from 'lucide-react';

const ModuleSelector = ({ selectedModule }) => {
  // Component is now disabled and only shows the selected module
  return (
    <div className="flex items-center gap-2 mb-4 opacity-50">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-[#0fcabb]" />
        <span className="text-sm text-[#72f0df]">Module:</span>
      </div>
      
      <div className="bg-[#064646] border border-[#0fcabb] rounded px-3 py-1 text-[#72f0df] text-sm">
        {selectedModule?.code ? `${selectedModule.code} - ${selectedModule.name}` : 'Managed by Admin'}
      </div>
      
      <span className="text-xs text-[#72f0df] opacity-70">
        (Module selection is now managed globally by administrators)
      </span>
    </div>
  );
};

export default ModuleSelector;
