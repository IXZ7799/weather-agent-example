
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useGlobalActiveModule } from '@/hooks/useGlobalActiveModule';

const GlobalModuleSelector = ({ modules }) => {
  const { activeModule, setGlobalActiveModule, loading } = useGlobalActiveModule();

  const handleModuleChange = async (moduleId) => {
    if (moduleId === 'none') {
      await setGlobalActiveModule(null);
    } else {
      await setGlobalActiveModule(moduleId);
    }
  };

  const handleClearModule = async () => {
    await setGlobalActiveModule(null);
  };

  if (loading) {
    return (
      <div className="bg-[#064646] border border-[#0fcabb] rounded-lg p-4">
        <div className="text-sm text-[#a0dad3] animate-pulse">Loading global module setting...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#064646] border border-[#0fcabb] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-[#0fcabb]">Global Active Module</h3>
        {activeModule && (
          <Button
            onClick={handleClearModule}
            variant="ghost"
            size="sm"
            className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
          >
            <X size={16} className="mr-2" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-[#a0dad3]">
          Set the active module that will be used by all users in the system. This affects the AI context and suggested questions.
        </div>
        
        {activeModule && (
          <div className="p-3 bg-[#022222] border border-[#0fcabb]/30 rounded">
            <div className="text-sm font-medium text-[#0fcabb]">Currently Active:</div>
            <div className="text-[#72f0df]">
              {activeModule.code ? `${activeModule.code} - ${activeModule.name}` : activeModule.name}
            </div>
            {activeModule.description && (
              <div className="text-xs text-[#a0dad3] mt-1">{activeModule.description}</div>
            )}
          </div>
        )}
        
        <Select value={activeModule?.id || 'none'} onValueChange={handleModuleChange}>
          <SelectTrigger className="bg-[#022222] border-[#0fcabb] text-[#72f0df]">
            <SelectValue placeholder="Select a module to set as active for all users" />
          </SelectTrigger>
          <SelectContent className="bg-[#064646] border-[#0fcabb] text-[#72f0df]">
            <SelectItem value="none" className="hover:bg-[#0fcabb]/20 focus:bg-[#0fcabb]/20">
              Click here to select a module
            </SelectItem>
            {modules.map((module) => (
              <SelectItem 
                key={module.id} 
                value={module.id}
                className="hover:bg-[#0fcabb]/20 focus:bg-[#0fcabb]/20"
              >
                {module.code ? `${module.code} - ${module.name}` : module.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default GlobalModuleSelector;
