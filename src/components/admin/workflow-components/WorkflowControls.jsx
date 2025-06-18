
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Play, Download } from 'lucide-react';

const WorkflowControls = ({
  availableTools,
  selectedTool,
  setSelectedTool,
  onAddToolToWorkflow,
  onAddDecisionNode,
  onAddMemoryNode,
  onClearWorkflow,
  onExecuteWorkflow,
  onSaveWorkflow,
  isExecuting,
  nodes,
}) => {
  return (
    <Card className="bg-[#064646] border-[#0fcabb]">
      <CardHeader>
        <CardTitle className="text-[#0fcabb]">Security Workflow Controls</CardTitle>
        <CardDescription className="text-[#a0dad3]">
          Design automated workflows using your security tools and agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tool Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[#0fcabb] text-sm font-medium mb-2 block">
                Add Security Tool to Workflow
              </label>
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger className="bg-[#022222] border-[#0fcabb] text-[#aef5eb]">
                  <SelectValue placeholder="Select a security tool..." />
                </SelectTrigger>
                <SelectContent className="bg-[#064646] border-[#0fcabb]">
                  {availableTools.map(tool => (
                    <SelectItem 
                      key={tool.id} 
                      value={tool.id}
                      className="text-[#aef5eb] focus:bg-[#0fcabb]/20"
                    >
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-xs text-[#a0dad3]">{tool.security_focus || tool.type}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onAddToolToWorkflow}
              disabled={!selectedTool}
              className="bg-[#0fcabb] text-[#022222] hover:bg-[#0fcabb]/80"
            >
              <Plus size={16} className="mr-2" />
              Add Tool
            </Button>
          </div>

          {/* Additional Nodes */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={onAddDecisionNode}
              variant="outline"
              className="border-[#0fcabb] text-[#0fcabb] hover:bg-[#0fcabb]/10"
            >
              Add Decision Node
            </Button>
            <Button
              onClick={onAddMemoryNode}
              variant="outline"
              className="border-[#0fcabb] text-[#0fcabb] hover:bg-[#0fcabb]/10"
            >
              Add Memory Node
            </Button>
            <Button
              onClick={onClearWorkflow}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/10"
            >
              Clear Workflow
            </Button>
          </div>

          {/* Execution Controls */}
          <div className="flex gap-2 pt-4 border-t border-[#0fcabb]/20">
            <Button
              onClick={onExecuteWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play size={16} className="mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </Button>
            <Button
              onClick={onSaveWorkflow}
              disabled={nodes.length === 0}
              variant="outline"
              className="border-[#0fcabb] text-[#0fcabb] hover:bg-[#0fcabb]/10"
            >
              <Download size={16} className="mr-2" />
              Export Workflow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowControls;
