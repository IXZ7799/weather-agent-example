
import { supabase } from '../integrations/supabase/client';

// Types for scaffolding requests
export interface ScaffoldingRequest {
  componentType: 'page' | 'component' | 'hook' | 'service' | 'util';
  name: string;
  description: string;
  securityFocus?: string;
  additionalContext?: string;
}

// Types for scaffolding responses
export interface ScaffoldingResult {
  code: string;
  filePath: string;
  integrationGuide: string;
}

/**
 * Generate code scaffold using the Mastra-powered scaffolding agent
 * @param request The scaffolding request details
 * @returns Promise with the generated code and integration guidance
 */
export async function generateScaffold(request: ScaffoldingRequest): Promise<ScaffoldingResult> {
  try {
    console.log('Calling Mastra scaffolding agent with request:', request);
    
    // Call the Mastra-powered scaffolding edge function
    const { data, error } = await supabase.functions.invoke('mastra-scaffold', {
      body: { request }
    });
    
    if (error) throw new Error(error.message);
    
    // Parse the response from the Mastra scaffolding agent
    const responseText = data?.response || 'No response from Mastra agent';
    
    // For this implementation, we'll parse the response and extract relevant parts
    // The agent should format its response with code, file path, and integration guidance
    return {
      code: responseText,
      filePath: `src/${request.componentType}s/${request.name}.tsx`, // Default path suggestion
      integrationGuide: 'See the response above for integration guidance.'
    };
  } catch (error) {
    console.error('Error generating scaffold with Mastra:', error);
    throw new Error(`Failed to generate scaffold with Mastra: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Stream scaffolding results for real-time feedback (placeholder for future implementation)
 * @param request The scaffolding request details
 * @returns Promise with the generated code and integration guidance
 */
export async function streamScaffold(request: ScaffoldingRequest): Promise<ScaffoldingResult> {
  try {
    // For now, we'll use the non-streaming version
    // Future implementation could support streaming from Mastra agents
    return await generateScaffold(request);
  } catch (error) {
    console.error('Error streaming scaffold with Mastra:', error);
    throw new Error(`Failed to stream scaffold with Mastra: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if Mastra scaffolding agent is available and properly configured
 */
export async function checkMastraScaffoldingStatus(): Promise<{
  isAvailable: boolean;
  message: string;
}> {
  try {
    // Test the Mastra scaffolding endpoint with a minimal request
    const testRequest: ScaffoldingRequest = {
      componentType: 'component',
      name: 'TestComponent',
      description: 'Test component for status check'
    };
    
    const { data, error } = await supabase.functions.invoke('mastra-scaffold', {
      body: { request: testRequest }
    });
    
    if (error) {
      return {
        isAvailable: false,
        message: `Mastra scaffolding agent error: ${error.message}`
      };
    }
    
    return {
      isAvailable: true,
      message: 'Mastra scaffolding agent is available and working'
    };
  } catch (error) {
    return {
      isAvailable: false,
      message: `Mastra scaffolding agent unavailable: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
