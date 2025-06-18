
import React from 'react';
import { Button } from '@/components/ui/button.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { MessageSquare, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.jsx';

const ConversationSidebar = ({
  modules,
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isVisible,
  typingTitles = {},
  isTyping = {},
  onMouseEnter,
  onMouseLeave,
  setIsConfirmationOpen
}) => {
  const getModuleName = (moduleId) => {
    if (!moduleId) return 'General';
    const module = modules.find(m => m.id === moduleId);
    return module ? (module.code ? `${module.code} - ${module.name}` : module.name) : 'Unknown Module';
  };

  const getDisplayTitle = (conversation) => {
    if (isTyping[conversation.id]) {
      return typingTitles[conversation.id] || '';
    }
    return conversation.title;
  };

  const groupedConversations = conversations.reduce((acc, conv) => {
    const moduleName = getModuleName(conv.module_id);
    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }
    acc[moduleName].push(conv);
    return acc;
  }, {});

  const handleDeleteClick = (e, conversationId) => {
    e.stopPropagation();
    
    // If shift key is held, delete immediately without confirmation
    if (e.shiftKey) {
      onDeleteConversation(conversationId);
      return;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed left-0 top-0 w-8 h-full bg-[#022222] border-r border-[#0fcabb] flex items-center justify-center z-10 transition-all duration-300 ease-in-out shadow-lg hover:w-10 hover:bg-[#033333]">
        <ChevronRight size={16} className="text-[#72f0df] opacity-50 transition-all duration-300 hover:opacity-80" />
      </div>
    );
  }

  return (
    <div 
      className="fixed left-0 top-0 w-80 h-full border-r border-[#0fcabb] bg-[#022222] flex flex-col z-20 shadow-xl transition-all duration-300 ease-in-out transform translate-x-0"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="p-4 border-b border-[#0fcabb]">
        <Button
          onClick={onNewConversation}
          className="w-full bg-[#0fcabb] text-[#022222] hover:bg-[#0fcabb]/90 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus size={16} className="mr-2" />
          New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedConversations).map(([moduleName, convs]) => (
            <div key={moduleName} className="mb-6">
              <h3 className="text-xs font-medium text-[#0fcabb] mb-3 px-2 uppercase tracking-wide">
                {moduleName}
              </h3>
              <div className="space-y-1">
                {convs.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`group relative rounded-lg transition-all duration-200 ease-in-out ${
                      currentConversation?.id === conversation.id
                        ? 'bg-[#0fcabb] text-[#022222] shadow-md ring-1 ring-[#0fcabb]/50'
                        : 'hover:bg-[#064646] text-[#72f0df] hover:shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => onSelectConversation(conversation)}
                      className="w-full text-left p-3 pr-10 transition-all duration-200 ease-in-out"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${
                            isTyping[conversation.id] ? 'animate-pulse' : ''
                          }`}>
                            {getDisplayTitle(conversation)}
                            {isTyping[conversation.id] && (
                              <span className="animate-pulse">|</span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            currentConversation?.id === conversation.id ? 'text-[#022222]/70' : 'text-[#72f0df]/60'
                          }`}>
                            {formatDistanceToNow(new Date(conversation.last_activity), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <AlertDialog onOpenChange={setIsConfirmationOpen}>
                        <AlertDialogTrigger asChild>
                          <button
                            className={`p-1 rounded hover:bg-red-500/20 transition-colors ${
                              currentConversation?.id === conversation.id ? 'text-[#022222] hover:text-red-600' : 'text-[#72f0df] hover:text-red-400'
                            }`}
                            onClick={(e) => handleDeleteClick(e, conversation.id)}
                            title="Click to confirm delete, Shift+Click to delete immediately"
                          >
                            <Trash2 size={12} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#022222] border-[#0fcabb] text-[#72f0df]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-[#0fcabb]">Delete Conversation</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#a0dad3]">
                              Are you sure you want to delete "{getDisplayTitle(conversation)}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-[#064646] border-[#0fcabb] text-[#72f0df] hover:bg-[#022222]">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteConversation(conversation.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationSidebar;
