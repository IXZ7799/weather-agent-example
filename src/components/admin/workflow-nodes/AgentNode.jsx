
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AgentNode = memo(({ data }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'primary': return 'bg-blue-500';
      case 'secondary': return 'bg-green-500';
      case 'specialist': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#064646] border-2 border-[#0fcabb] rounded-lg p-4 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="bg-[#0fcabb]" />
      
      <div className="flex items-center gap-2 mb-2">
        <Bot size={16} className="text-[#0fcabb]" />
        <span className="text-[#aef5eb] font-medium">{data.label}</span>
      </div>
      
      <Badge className={`${getTypeColor(data.agentType)} text-white text-xs mb-2`}>
        {data.agentType}
      </Badge>
      
      <p className="text-[#a0dad3] text-xs leading-tight">
        {data.instructions}
      </p>
      
      <div className="flex justify-center mt-2">
        <Settings size={12} className="text-[#72f0df]" />
      </div>
      
      <Handle type="source" position={Position.Bottom} className="bg-[#0fcabb]" />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';

export default AgentNode;
