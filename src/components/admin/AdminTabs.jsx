
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminTabs = ({ activeTab, setActiveTab, title }) => {
  const navigate = useNavigate();
  const tabs = [
    { id: 'settings', label: 'System Settings' },
    { id: 'users', label: 'User Management' },
    { id: 'modules', label: 'CS Modules' },
  ];

  return (
    <div className="sticky top-0 z-10 flex justify-between mb-6 border-b border-[#0fcabb] pb-4 bg-[#022222] pt-2">
      <div className="flex items-center">
        {title && (
          <h1 className="text-3xl font-bold text-[#0fcabb] mr-4">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            variant="ghost"
            size="sm"
            className={
              activeTab === tab.id
                ? "bg-[#0fcabb] text-[#022222] font-medium shadow-md hover:bg-[#0fcabb] transition-colors border-0"
                : "bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] transition-all"
            }
          >
            {tab.label}
          </Button>
        ))}
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all ml-2"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Chat
        </Button>
      </div>
    </div>
  );
};

export default AdminTabs;
