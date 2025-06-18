import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Brain, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';

const MemoryManagement = () => {
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState({
    type: 'short-term',
    importance: 3,
    tags: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockMemories = [
      {
        id: '1',
        type: 'long-term',
        content: 'User prefers technical explanations over simplified ones',
        context: 'Learning preference analysis',
        importance: 4,
        userId: 'user-123',
        agentId: 'agent-1',
        timestamp: new Date(Date.now() - 86400000),
        tags: ['preference', 'learning-style']
      },
      {
        id: '2',
        type: 'semantic',
        content: 'Cybersecurity incident response procedure for SQL injection',
        context: 'Security knowledge base',
        importance: 5,
        timestamp: new Date(Date.now() - 3600000),
        tags: ['security', 'sql-injection', 'incident-response']
      },
      {
        id: '3',
        type: 'short-term',
        content: 'Currently discussing network security fundamentals',
        context: 'Active conversation topic',
        importance: 2,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        tags: ['conversation', 'network-security']
      }
    ];
    setMemories(mockMemories);
  }, []);

  const addMemory = () => {
    if (!newMemory.content || !newMemory.context) {
      toast.error('Please fill in content and context');
      return;
    }

    const memory = {
      id: Date.now().toString(),
      type: newMemory.type || 'short-term',
      content: newMemory.content,
      context: newMemory.context,
      importance: newMemory.importance || 3,
      userId: newMemory.userId,
      agentId: newMemory.agentId,
      timestamp: new Date(),
      expiresAt: newMemory.type === 'short-term' ? new Date(Date.now() + 3600000) : undefined,
      tags: newMemory.tags || []
    };

    setMemories([...memories, memory]);
    setNewMemory({ type: 'short-term', importance: 3, tags: [] });
    toast.success('Memory entry added successfully');
  };

  const removeMemory = (id) => {
    setMemories(memories.filter(m => m.id !== id));
    toast.success('Memory entry removed');
  };

  const addTag = (tag) => {
    if (tag && !newMemory.tags?.includes(tag)) {
      setNewMemory({
        ...newMemory,
        tags: [...(newMemory.tags || []), tag]
      });
    }
  };

  const removeTag = (tagToRemove) => {
    setNewMemory({
      ...newMemory,
      tags: newMemory.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memory.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || memory.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'short-term': return 'bg-blue-500';
      case 'long-term': return 'bg-green-500';
      case 'semantic': return 'bg-purple-500';
      case 'user-specific': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getImportanceColor = (importance) => {
    if (importance >= 4) return 'text-red-400';
    if (importance >= 3) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-[#0fcabb]" size={24} />
        <h3 className="text-lg font-semibold">Memory Management System</h3>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#a0dad3]" />
            <Input
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#064646] border-[#0fcabb] text-[#72f0df]"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 bg-[#064646] border-[#0fcabb] text-[#72f0df]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-[#064646] border-[#0fcabb]">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="short-term">Short-term</SelectItem>
            <SelectItem value="long-term">Long-term</SelectItem>
            <SelectItem value="semantic">Semantic</SelectItem>
            <SelectItem value="user-specific">User-specific</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add New Memory */}
      <Card className="bg-[#064646] border-[#0fcabb]">
        <CardHeader>
          <CardTitle className="text-[#0fcabb]">Add New Memory Entry</CardTitle>
          <CardDescription className="text-[#a0dad3]">
            Create a new memory entry for the AI system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#72f0df]">Memory Type</Label>
              <Select value={newMemory.type} onValueChange={(value) => setNewMemory({...newMemory, type: value})}>
                <SelectTrigger className="bg-[#022222] border-[#0fcabb] text-[#72f0df]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#064646] border-[#0fcabb]">
                  <SelectItem value="short-term">Short-term (expires in 1 hour)</SelectItem>
                  <SelectItem value="long-term">Long-term (persistent)</SelectItem>
                  <SelectItem value="semantic">Semantic (knowledge base)</SelectItem>
                  <SelectItem value="user-specific">User-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#72f0df]">Importance (1-5)</Label>
              <Select value={newMemory.importance?.toString()} onValueChange={(value) => setNewMemory({...newMemory, importance: parseInt(value)})}>
                <SelectTrigger className="bg-[#022222] border-[#0fcabb] text-[#72f0df]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#064646] border-[#0fcabb]">
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2 - Below Average</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - High</SelectItem>
                  <SelectItem value="5">5 - Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[#72f0df]">Content</Label>
            <Textarea
              placeholder="Enter the memory content..."
              value={newMemory.content || ''}
              onChange={(e) => setNewMemory({...newMemory, content: e.target.value})}
              className="bg-[#022222] border-[#0fcabb] text-[#72f0df]"
            />
          </div>

          <div>
            <Label className="text-[#72f0df]">Context</Label>
            <Input
              placeholder="Enter the context or source..."
              value={newMemory.context || ''}
              onChange={(e) => setNewMemory({...newMemory, context: e.target.value})}
              className="bg-[#022222] border-[#0fcabb] text-[#72f0df]"
            />
          </div>

          <div>
            <Label className="text-[#72f0df]">Tags</Label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {newMemory.tags?.map((tag, index) => (
                <Badge key={index} variant="secondary" className="bg-[#0fcabb22] text-[#0fcabb]">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 text-xs">×</button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add tags (press Enter)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="bg-[#022222] border-[#0fcabb] text-[#72f0df]"
            />
          </div>

          <Button onClick={addMemory} className="bg-[#0fcabb] text-[#022222] hover:bg-[#0fcabb]/80">
            <Plus size={16} className="mr-2" />
            Add Memory Entry
          </Button>
        </CardContent>
      </Card>

      {/* Memory Entries */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-[#0fcabb]">
          Memory Entries ({filteredMemories.length})
        </h4>
        {filteredMemories.map((memory) => (
          <Card key={memory.id} className="bg-[#064646] border-[#0fcabb]">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${getTypeColor(memory.type)} text-white`}>
                    {memory.type}
                  </Badge>
                  <span className={`text-sm font-medium ${getImportanceColor(memory.importance)}`}>
                    Priority: {memory.importance}/5
                  </span>
                  {memory.expiresAt && (
                    <Badge variant="outline" className="text-[#a0dad3] border-[#a0dad3]">
                      <Clock size={12} className="mr-1" />
                      Expires: {memory.expiresAt.toLocaleTimeString()}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMemory(memory.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[#0fcabb] font-medium">Content: </span>
                  <span className="text-[#aef5eb]">{memory.content}</span>
                </div>
                <div>
                  <span className="text-[#0fcabb] font-medium">Context: </span>
                  <span className="text-[#a0dad3]">{memory.context}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#a0dad3]">
                  <span>Created: {memory.timestamp.toLocaleString()}</span>
                  {memory.userId && <span>• User: {memory.userId}</span>}
                  {memory.agentId && <span>• Agent: {memory.agentId}</span>}
                </div>
                {memory.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {memory.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-[#72f0df] border-[#72f0df] text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MemoryManagement;
