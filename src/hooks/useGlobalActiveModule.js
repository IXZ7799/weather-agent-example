
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useGlobalActiveModule = () => {
  const { user, isAdmin } = useAuth();
  const [activeModule, setActiveModule] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadActiveModule = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      
      // Get the global active module setting
      const { data: globalSetting, error: settingError } = await supabase
        .from('global_settings')
        .select('setting_value')
        .eq('setting_key', 'active_module_id')
        .maybeSingle();

      if (settingError) {
        console.warn('Could not load global setting (non-fatal):', settingError);
        setActiveModule(null);
        setLoading(false);
        return;
      }

      if (globalSetting?.setting_value) {
        
        // Load the actual module data
        const { data: module, error: moduleError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', globalSetting.setting_value)
          .maybeSingle();

        if (moduleError) {
          console.warn('Could not load active module (non-fatal):', moduleError);
          setActiveModule(null);
        } else if (module) {
          setActiveModule(module);
        } else {
          setActiveModule(null);
        }
      } else {
        setActiveModule(null);
      }
    } catch (error) {
      console.error('Error loading active module:', error);
      setActiveModule(null);
    } finally {
      setLoading(false);
    }
  };

  const setGlobalActiveModule = async (moduleId) => {
    if (!user || !isAdmin) {
      toast.error('Only admins can set the global active module');
      return false;
    }

    try {
      console.log('Setting global active module to:', moduleId);
      
      if (moduleId) {
        // Update or insert the global setting
        // Use onConflict to properly handle the unique constraint
        const { error } = await supabase
          .from('global_settings')
          .upsert({
            setting_key: 'active_module_id',
            setting_value: moduleId,
            description: 'Currently active module for all users'
          }, { 
            onConflict: 'setting_key',
            ignoreDuplicates: false
          });

        if (error) throw error;
        
        // Load the module data to update local state
        const { data: module, error: moduleError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (moduleError) throw moduleError;
        
        setActiveModule(module);
        toast.success(`Set "${module.name}" as the active module for all users`);
      } else {
        // Clear the active module
        const { error } = await supabase
          .from('global_settings')
          .delete()
          .eq('setting_key', 'active_module_id');

        if (error) throw error;
        
        setActiveModule(null);
        toast.success('Cleared the active module for all users');
      }
      
      return true;
    } catch (error) {
      console.error('Error setting global active module:', error);
      toast.error('Failed to set global active module');
      return false;
    }
  };

  useEffect(() => {
    loadActiveModule();
  }, [user]);

  // Listen for real-time changes to global settings
  useEffect(() => {
    if (!user) return;

    // Create a unique channel name with timestamp to prevent conflicts
    const uniqueChannelName = `global_settings_changes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_settings',
          filter: 'setting_key=eq.active_module_id'
        },
        (payload) => {
          console.log('Global active module setting changed:', payload);
          loadActiveModule(); // Reload when the setting changes
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    activeModule,
    loading,
    setGlobalActiveModule,
    refreshActiveModule: loadActiveModule
  };
};
