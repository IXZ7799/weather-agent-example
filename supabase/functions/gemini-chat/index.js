
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to Supabase Edge Function Secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, systemPrompt, operation = 'enhance', imageData } = await req.json();

    if (!text && !imageData) {
      throw new Error('Text content or image data is required');
    }

    console.log(`Processing ${operation} operation with text length: ${text?.length || 0}`);
    console.log(`Has image data: ${!!imageData}`);
    if (imageData) {
      console.log(`Image data size: ${imageData.length} characters`);
    }

    let prompt = '';
    
    switch (operation) {
      case 'summarize':
        prompt = `Please create a comprehensive summary of this educational content. Focus on key concepts, main topics, and important details that would be useful for studying:\n\n${text}`;
        break;
      case 'enhance':
        prompt = `Clean up and enhance this educational content for better readability while preserving all important information. Structure it clearly with proper formatting:\n\n${text}`;
        break;
      case 'extract-concepts':
        prompt = `Extract and list the main concepts, topics, and key terms from this educational content. Format as a structured list:\n\n${text}`;
        break;
      case 'notebook-style':
        prompt = `Process this educational content in a NotebookLM style - create a well-structured, comprehensive summary with key insights, main concepts, and important details organized for study purposes:\n\n${text}`;
        break;
      case 'comprehensive-visual-analysis':
      case 'content-enhancement':
      case 'content-analysis':
      case 'precise-title-generation':
      case 'precise-description-generation':
        prompt = text; // For these operations, the text already contains the full prompt
        break;
      default:
        prompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
    }

    // Prepare the request body for Gemini
    const requestBody = {
      contents: [
        {
          parts: []
        }
      ],
      generationConfig: {
        temperature: operation.includes('precise') ? 0.1 : 0.3,
        maxOutputTokens: 8192,
        topP: 0.8,
        topK: 40
      }
    };

    // For visual analysis, add image data FIRST if provided
    if (imageData && operation === 'comprehensive-visual-analysis') {
      try {
        // Validate and process image data
        if (!imageData.startsWith('data:')) {
          throw new Error('Invalid image data format - must be data URL');
        }
        
        const [header, base64Data] = imageData.split(',');
        if (!base64Data) {
          throw new Error('No base64 data found in image');
        }
        
        const mimeType = header.split(';')[0].split(':')[1];
        if (!mimeType) {
          throw new Error('No MIME type found in image data');
        }
        
        console.log(`Processing image: ${mimeType}, base64 length: ${base64Data.length}`);
        
        // Add image data to request
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
        
        console.log('Image data added to Gemini request');
      } catch (imageError) {
        console.error('Error processing image data:', imageError);
        return new Response(JSON.stringify({ 
          error: `Image processing failed: ${imageError.message}`,
          operation: operation
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Add text content (always add, even for visual analysis)
    if (prompt) {
      requestBody.contents[0].parts.push({
        text: prompt
      });
      console.log('Text prompt added to Gemini request');
    }

    console.log(`Making Gemini API request for operation: ${operation}`);
    console.log(`Request parts: ${requestBody.contents[0].parts.length} (${requestBody.contents[0].parts.map(p => p.inline_data ? 'image' : 'text').join(', ')})`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} - ${errorText}`);
      
      return new Response(JSON.stringify({ 
        error: `Gemini API error: ${response.status}`,
        details: errorText,
        operation: operation,
        hasApiKey: !!GEMINI_API_KEY
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Gemini API response received successfully');

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('No response content received from Gemini');
      console.error('Response structure:', JSON.stringify(data, null, 2));
      
      // Check for safety ratings or other issues
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        return new Response(JSON.stringify({ 
          error: 'Content was filtered by Gemini safety settings',
          details: 'The document may contain content that triggers safety filters',
          operation: operation
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('No response content received from Gemini - check API response structure');
    }

    console.log(`Generated text length: ${generatedText.length} characters`);
    
    // Validation for visual analysis responses
    if (operation === 'comprehensive-visual-analysis') {
      const lowerResponse = generatedText.toLowerCase();
      const problematicPhrases = [
        'please provide',
        'i\'m ready to analyze',
        'awaiting content',
        'based on the extremely limited information',
        'just page numbers',
        'educated guesses',
        'very generic',
        'don\'t have a specific title'
      ];
      
      const hasProblematicContent = problematicPhrases.some(phrase => 
        lowerResponse.includes(phrase)
      );
      
      if (hasProblematicContent) {
        console.warn('Gemini returned problematic placeholder response');
        return new Response(JSON.stringify({ 
          error: 'Gemini could not analyze the document content effectively',
          details: 'The document may be too complex, corrupted, or the content is not clearly visible',
          operation: operation,
          response: generatedText.substring(0, 500) + '...'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (generatedText.length < 500) {
        console.warn('Gemini response too short for meaningful analysis');
        return new Response(JSON.stringify({ 
          error: 'Insufficient content extracted from document',
          details: 'The document analysis produced very limited results',
          operation: operation
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Visual analysis validation passed');
    }

    console.log(`Content preview: ${generatedText.substring(0, 200)}...`);

    return new Response(JSON.stringify({ 
      response: generatedText,
      operation: operation,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check Supabase function logs for more details',
      hasApiKey: !!GEMINI_API_KEY
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
