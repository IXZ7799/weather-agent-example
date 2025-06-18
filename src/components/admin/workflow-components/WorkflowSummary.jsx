
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Node } from '@xyflow/react';

const WorkflowSummary = ({ nodes }) => {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#064646] border-[#0fcabb]">
      <CardHeader>
        <CardTitle className="text-[#0fcabb]">Workflow Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-[#0fcabb] font-medium">Total Nodes: </span>
            <span className="text-[#aef5eb]">{nodes.length}</span>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Security Tools: </span>
            <span className="text-[#aef5eb]">
              {nodes.filter(n => n.type === 'tool').length}
            </span>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Decision Points: </span>
            <span className="text-[#aef5eb]">
              {nodes.filter(n => n.type === 'decision').length}
            </span>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Memory Nodes: </span>
            <span className="text-[#aef5eb]">
              {nodes.filter(n => n.type === 'memory').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowSummary;
