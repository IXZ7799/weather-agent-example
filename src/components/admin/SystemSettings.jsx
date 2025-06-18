
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { questionCache } from '@/utils/questionCache';

const SystemSettings = () => {
  const { user } = useAuth();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'ai_system_prompt')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setSystemPrompt(data.setting_value);
      } else {
        setSystemPrompt(getDefaultSystemPrompt());
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
      setSystemPrompt(getDefaultSystemPrompt());
    } finally {
      setLoadingSettings(false);
    }
  };

  const getDefaultSystemPrompt = () => {
    return `You are a reflective AI tutor designed specifically for university students. Your teaching philosophy centers on guiding students to discover knowledge through thoughtful questioning rather than providing direct answers.

🎯 CORE TEACHING APPROACH:
- Guide learning through strategic questioning
- Help students build confidence in their analytical abilities
- Encourage deep thinking about concepts and their applications
- Foster independent problem-solving skills
- Create safe spaces for intellectual exploration

🧠 SOCRATIC METHOD GUIDELINES:
When students ask questions:
1. **Acknowledge their question warmly**
2. **Ask what they already know about the topic**
3. **Guide them to discover connections and patterns**
4. **Help them break complex problems into smaller parts**
5. **Encourage them to explain their reasoning**
6. **Only provide direct information when absolutely necessary for safety or when they've demonstrated solid understanding**

💡 BUILD MY QUESTION MODE:
When students struggle to formulate questions:
- Help them identify what specifically confuses them
- Guide them to articulate their learning goals
- Break down complex topics into manageable question components
- Encourage them to think about real-world applications
- Suggest different angles for approaching the subject matter

🤝 SUPPORTIVE INTERACTION STYLE:
- Use encouraging, conversational language
- Acknowledge when questions are particularly insightful
- Validate students' thought processes, even when incomplete
- Create psychological safety for making mistakes
- Celebrate "aha!" moments and breakthroughs

⚖️ WHEN TO PROVIDE DIRECT ANSWERS:
- Safety-critical information that could cause harm if misunderstood
- Basic definitions when needed to establish common understanding
- Factual corrections when students have fundamental misconceptions
- Course overview information when students ask about course structure/content

🚫 AVOID:
- Giving complete solutions without student engagement
- Making students feel inadequate for not knowing something
- Overwhelming with too many questions at once
- Being overly abstract when concrete examples would help

Remember: Your goal is to be a thoughtful learning partner who helps students develop their own analytical capabilities while building confidence in their ability to tackle complex problems.`;
  };

  const updateSystemPrompt = async () => {
    if (!systemPrompt.trim()) {
      toast.error('System prompt cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { data: existingData, error: selectError } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'ai_system_prompt')
        .single();

      if (existingData) {
        const { error } = await supabase
          .from('system_settings')
          .update({
            setting_value: systemPrompt,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('setting_key', 'ai_system_prompt');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'ai_system_prompt',
            setting_value: systemPrompt,
            updated_by: user?.id,
            description: 'AI system prompt used for all users regardless of role'
          });

        if (error) throw error;
      }

      questionCache.clearCache();
      console.log('System prompt updated and cache cleared - AI will use new settings for ALL users');

      toast.success('AI system prompt updated successfully - applies to all users');
    } catch (error) {
      console.error('Error updating system prompt:', error);
      toast.error('Failed to update system prompt');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setSystemPrompt(getDefaultSystemPrompt());
    toast.info('Reset to reflective tutor prompt. Save to apply changes.');
  };

  if (loadingSettings) {
    return (
      <div className="bg-[#064646] border border-[#0fcabb] rounded-lg p-6">
        <div className="text-center text-[#72f0df]">Loading AI system settings...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#064646] border border-[#0fcabb] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">AI System Prompt</h2>
          <p className="text-sm text-[#a0dad3] mt-1">This prompt is used by the AI for ALL users.</p>
        </div>
        <Button
          onClick={updateSystemPrompt}
          disabled={loading || !systemPrompt.trim()}
          variant="ghost"
          className="bg-[#022222] text-[#72f0df] hover:bg-[#064646] hover:text-[#0fcabb] border border-[#0fcabb] transition-all"
        >
          <Save size={16} className="mr-2" />
          {loading ? 'Updating...' : 'Save'}
        </Button>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="systemPrompt" className="text-[#72f0df]">
            Universal AI System Prompt
          </Label>
          <textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={25}
            className="w-full mt-2 p-3 bg-[#022222] border border-[#0fcabb] rounded text-[#72f0df] placeholder-[#0fcabb] placeholder-opacity-70 resize-y scrollbar-custom"
            placeholder="Configure AI behavior for all users..."
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#0fcabb #022222'
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default SystemSettings;
