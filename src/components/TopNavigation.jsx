import React from 'react';
import { BookOpen } from 'lucide-react';
import UserButton from '@/components/UserButton.jsx';

const TopNavigation = ({ currentConversation, activeModule }) => {
  return (
    <div className="sticky top-0 z-30 bg-[#022222] border-b border-[#0fcabb] p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">CS Teaching Assistant</h1>
          {currentConversation && (
            <div className="text-sm text-[#a0dad3] mt-1">
              {currentConversation.title}
            </div>
          )}
        </div>
        <UserButton />
      </div>
      
      {/* Display Active Module */}
      {activeModule && (
        <div className="flex items-center gap-2 mt-3 p-2 bg-[#064646] rounded border border-[#0fcabb]">
          <BookOpen size={16} className="text-[#0fcabb]" />
          <span className="text-sm text-[#72f0df]">Active Module:</span>
          <span className="text-sm text-[#0fcabb] font-medium">{activeModule.name}</span>
        </div>
      )}
    </div>
  );
};

export default TopNavigation;
