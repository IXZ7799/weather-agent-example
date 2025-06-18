
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, HelpCircle } from 'lucide-react';

const DecisionNode = memo(({ data }) => {
  return (
    <div className="bg-[#064646] border-2 border-[#0fcabb] rounded-lg p-4 min-w-[180px] relative">
      <Handle type="target" position={Position.Top} className="bg-[#0fcabb]" />
      
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={16} className="text-[#0fcabb]" />
        <span className="text-[#aef5eb] font-medium text-sm">{data.label}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs">
          <HelpCircle size={10} className="text-[#a0dad3]" />
          <code className="text-[#0fcabb] bg-[#0fcabb22] px-1 rounded text-xs">
            {data.condition}
          </code>
        </div>
        
        <p className="text-[#a0dad3] text-xs leading-tight">
          {data.description}
        </p>
      </div>
      
      {/* Multiple output handles for branching */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true"
        className="bg-green-500" 
        style={{ left: '30%' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false"
        className="bg-red-500" 
        style={{ left: '70%' }}
      />
      
      <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-xs">
        <span className="text-green-400">T</span>
        <span className="text-red-400">F</span>
      </div>
    </div>
  );
});

DecisionNode.displayName = 'DecisionNode';

export default DecisionNode;
