
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Brain, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MemoryNode = memo(({ data }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'short-term': return 'bg-yellow-500';
      case 'long-term': return 'bg-green-500';
      case 'semantic': return 'bg-purple-500';
      case 'user-specific': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#064646] border-2 border-[#0fcabb] rounded-lg p-4 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="bg-[#0fcabb]" />
      
      <div className="flex items-center gap-2 mb-2">
        <Brain size={16} className="text-[#0fcabb]" />
        <span className="text-[#aef5eb] font-medium text-sm">{data.label}</span>
      </div>
      
      <div className="space-y-1">
        <Badge className={`${getTypeColor(data.memoryType)} text-white text-xs`}>
          {data.memoryType}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-[#a0dad3]">
          <Database size={10} />
          <span>{data.retention}</span>
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="bg-[#0fcabb]" />
    </div>
  );
});

MemoryNode.displayName = 'MemoryNode';

export default MemoryNode;
