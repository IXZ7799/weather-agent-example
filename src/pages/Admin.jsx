import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminTabs from '@/components/admin/AdminTabs';
import GlobalModuleSelector from '@/components/admin/GlobalModuleSelector';
import SystemSettings from '@/components/admin/SystemSettings';
import UserManagement from '@/components/admin/UserManagement';
import ModuleManagement from '@/components/admin/ModuleManagement';
import { useConversations } from '@/hooks/useConversations';

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { modules } = useConversations();
  const [activeTab, setActiveTab] = useState('settings');
  const [moduleRefreshTrigger, setModuleRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#022222] text-[#72f0df] font-mono flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  // Handle tab changes and trigger module refresh when modules tab is clicked
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'modules') {
      setModuleRefreshTrigger(prev => prev + 1);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SystemSettings />;
      case 'users':
        return <UserManagement />;
      case 'modules':
        return <ModuleManagement refreshTrigger={moduleRefreshTrigger} />;
      default:
        return <SystemSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-[#022222] text-[#72f0df] font-mono">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          {/* Admin Tabs with inline title */}
          <AdminTabs 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            title="Admin Dashboard" 
          />
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Admin;
