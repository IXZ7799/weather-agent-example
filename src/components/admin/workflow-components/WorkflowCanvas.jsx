
import React from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
} from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import AgentNode from '../workflow-nodes/AgentNode';
import MemoryNode from '../workflow-nodes/MemoryNode';
import ToolNode from '../workflow-nodes/ToolNode';
import DecisionNode from '../workflow-nodes/DecisionNode';

const nodeTypes = {
  agent: AgentNode,
  memory: MemoryNode,
  tool: ToolNode,
  decision: DecisionNode,
};

const WorkflowCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
}) => {
  return (
    <Card className="bg-[#064646] border-[#0fcabb]">
      <CardContent className="p-0">
        <div style={{ width: '100%', height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="top-right"
            style={{ backgroundColor: '#022222' }}
          >
            <Controls className="bg-[#064646] border-[#0fcabb]" />
            <MiniMap 
              className="bg-[#064646] border-[#0fcabb]"
              nodeColor="#0fcabb"
              maskColor="rgba(6, 70, 70, 0.8)"
            />
            <Background color="#0fcabb" gap={16} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowCanvas;
