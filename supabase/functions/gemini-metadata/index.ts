import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    console.log('Authenticated user:', user.email)

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Parse request body
    const { text, fileName } = await req.json()
    
    if (!text) {
      throw new Error('Text content is required')
    }

    console.log('Generating metadata for document:', fileName)

    // Truncate text to reasonable length for API
    const truncatedText = text.substring(0, 15000)

    // Create prompt for Gemini
    const prompt = `Analyze the following document content and generate a concise title and description for educational purposes.

Document filename: ${fileName || 'Unknown'}

Content:
${truncatedText}

Please provide a response in the following JSON format:
{
  "title": "A clear, descriptive title (max 100 characters)",
  "description": "A brief summary describing the document's content and purpose (max 500 characters)"
}

Focus on the main topics, key concepts, and educational value of the document.`

    // Call Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`)
    }

    const geminiResult = await geminiResponse.json()
    
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      throw new Error('No response generated from Gemini API')
    }

    const generatedText = geminiResult.candidates[0].content.parts[0].text
    console.log('Generated text:', generatedText)

    // Try to parse JSON from the response
    let metadata
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini response:', parseError)
      // Fallback: create metadata from the raw response
      metadata = {
        title: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Document',
        description: generatedText.substring(0, 500)
      }
    }

    // Ensure title and description are present and within limits
    const result = {
      title: (metadata.title || fileName || 'Document').substring(0, 100),
      description: (metadata.description || 'Educational document').substring(0, 500)
    }

    console.log('Generated metadata:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in gemini-metadata function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: 'Failed to generate document metadata'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
