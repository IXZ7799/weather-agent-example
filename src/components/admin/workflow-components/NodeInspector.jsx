
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const NodeInspector = ({ selectedNode }) => {
  if (!selectedNode) {
    return null;
  }

  return (
    <Card className="bg-[#064646] border-[#0fcabb]">
      <CardHeader>
        <CardTitle className="text-[#0fcabb]">Tool Inspector</CardTitle>
        <CardDescription className="text-[#a0dad3]">
          Configure the selected workflow component
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <span className="text-[#0fcabb] font-medium">Node ID: </span>
            <Badge variant="outline" className="text-[#72f0df] border-[#72f0df]">
              {selectedNode.id}
            </Badge>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Type: </span>
            <Badge className="bg-[#0fcabb] text-[#022222]">
              {selectedNode.type}
            </Badge>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Name: </span>
            <span className="text-[#aef5eb]">
              {typeof selectedNode.data.label === 'string' ? selectedNode.data.label : 'No name'}
            </span>
          </div>
          <div>
            <span className="text-[#0fcabb] font-medium">Position: </span>
            <span className="text-[#a0dad3]">
              x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
            </span>
          </div>
          {selectedNode.data.description && typeof selectedNode.data.description === 'string' && (
            <div>
              <span className="text-[#0fcabb] font-medium">Description: </span>
              <span className="text-[#a0dad3]">{selectedNode.data.description}</span>
            </div>
          )}
          {selectedNode.data.securityFocus && typeof selectedNode.data.securityFocus === 'string' && (
            <div>
              <span className="text-[#0fcabb] font-medium">Security Focus: </span>
              <span className="text-[#a0dad3]">{selectedNode.data.securityFocus}</span>
            </div>
          )}
          {selectedNode.data.toolType && typeof selectedNode.data.toolType === 'string' && (
            <div>
              <span className="text-[#0fcabb] font-medium">Tool Type: </span>
              <Badge variant="outline" className="text-[#72f0df] border-[#72f0df]">
                {selectedNode.data.toolType}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NodeInspector;
