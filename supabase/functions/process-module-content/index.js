
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DENO_ENV_GET = (key) => {
  return typeof Deno !== 'undefined' && Deno.env ? Deno.env.get(key) : undefined;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { contentId, extractedText, metadata, useAI = true, moduleId, enhancedProcessing = false } = requestBody;

  if (!contentId || !extractedText) {
    return new Response(
      JSON.stringify({ error: 'Missing contentId or extractedText' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Processing content for ID: ${contentId}`);
  console.log(`Enhanced processing: ${enhancedProcessing}`);
  console.log(`Extracted text length: ${extractedText.length} characters`);
  console.log(`Use AI enhancement: ${useAI}`);
  console.log(`Module ID: ${moduleId}`);

  try {
    const supabaseClient = createClient(
      DENO_ENV_GET('SUPABASE_URL') ?? '',
      DENO_ENV_GET('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient
      .from('module_content')
      .update({ processing_status: 'processing' })
      .eq('id', contentId);

    let processedContent = extractedText;
    let enhancementUsed = false;
    let generatedTitle = null;
    let generatedDescription = null;

    if (useAI && extractedText.length > 100) {
      try {
        console.log('Processing content with enhanced Gemini analysis...');
        
        let textToProcess = extractedText;
        const estimatedTokens = Math.ceil(extractedText.length / 4);
        const maxTokens = 800000; 
        
        if (estimatedTokens > maxTokens) {
          console.log(`Text too long (${estimatedTokens} tokens), truncating to ${maxTokens} tokens...`);
          textToProcess = truncateText(extractedText, maxTokens);
        }
        
        const { data: geminiResult, error: geminiError } = await supabaseClient.functions.invoke('gemini-chat', {
          body: {
            text: textToProcess,
            operation: 'notebook-style'
          }
        });

        if (geminiError) {
          console.error('Gemini processing error:', geminiError);
          console.log('Using extracted text without AI enhancement');
        } else if (geminiResult?.response) {
          processedContent = geminiResult.response;
          enhancementUsed = true;
          console.log('Successfully processed with Gemini');
          console.log(`Enhanced content length: ${processedContent.length} characters`);
        } else {
          console.log('No response from Gemini, using extracted text');
        }

        if (moduleId && enhancementUsed && !enhancedProcessing) {
          console.log('Generating enhanced title and description for module...');
          
          // Enhanced title generation with content analysis
          const contentAnalysis = metadata?.contentAnalysis || analyzeContentStructure(textToProcess);
          
          const enhancedTitlePrompt = `Based on this ${contentAnalysis.contentType || 'educational'} computer science content, generate a precise, descriptive title (4-8 words maximum).

Content Analysis:
- Subject Area: ${contentAnalysis.subject || 'computer science'}
- Content Type: ${contentAnalysis.contentType || 'educational material'}
- Difficulty Level: ${contentAnalysis.difficulty || 'intermediate'}
- Key Topics: ${contentAnalysis.topics?.slice(0, 5).join(', ') || 'various topics'}
- Main Concepts: ${contentAnalysis.concepts?.slice(0, 3).join(', ') || 'core concepts'}

Content Preview (first 2000 characters):
${textToProcess.slice(0, 2000)}...

Requirements:
- Make the title specific and descriptive
- Include the main subject/technology if clearly identifiable
- Avoid generic terms like "Course" or "Material"
- Focus on the specific topic, skill, or technology being taught
- Use proper technical terminology
- Keep it concise but informative (4-8 words)
- Make it appealing to students looking for this specific knowledge

Generate ONLY the title, no additional text:`;
          
          const { data: titleResult, error: titleError } = await supabaseClient.functions.invoke('gemini-chat', {
            body: {
              text: enhancedTitlePrompt,
              operation: 'enhanced-title-generation'
            }
          });

          if (!titleError && titleResult?.response) {
            generatedTitle = titleResult.response.trim().replace(/['"]/g, '');
            console.log('Enhanced title generated:', generatedTitle);
          }

          // Enhanced description generation with context
          const enhancedDescriptionPrompt = `Based on this ${contentAnalysis.contentType || 'educational'} computer science content titled "${generatedTitle || 'Educational Material'}", write a comprehensive and engaging description (3-4 sentences, 100-150 words).

Content Analysis:
- Subject Area: ${contentAnalysis.subject || 'computer science'}
- Content Type: ${contentAnalysis.contentType || 'educational material'}
- Difficulty Level: ${contentAnalysis.difficulty || 'intermediate'}
- Key Topics: ${contentAnalysis.topics?.slice(0, 8).join(', ') || 'various topics'}
- Main Concepts: ${contentAnalysis.concepts?.slice(0, 5).join(', ') || 'core concepts'}

Content Preview (first 3000 characters):
${textToProcess.slice(0, 3000)}...

Requirements:
- Start with what students will learn or accomplish
- Mention specific technologies, concepts, frameworks, or skills covered
- Include the difficulty level and target audience (beginner/intermediate/advanced)
- Highlight practical applications or real-world relevance
- Use engaging, educational language that motivates learning
- Be specific about learning outcomes and benefits
- Mention any prerequisites if apparent from content
- Focus on value proposition and practical benefits
- Make it appealing to students interested in this area

Write a compelling course description that clearly communicates the value and learning outcomes:`;
          
          const { data: descriptionResult, error: descriptionError } = await supabaseClient.functions.invoke('gemini-chat', {
            body: {
              text: enhancedDescriptionPrompt,
              operation: 'enhanced-description-generation'
            }
          });

          if (!descriptionError && descriptionResult?.response) {
            generatedDescription = descriptionResult.response.trim();
            console.log('Enhanced description generated, length:', generatedDescription.length);
          }
        }
      } catch (aiError) {
        console.error('AI enhancement failed, using extracted text:', aiError);
      }
    } else {
      console.log('Skipping AI enhancement - text too short or AI disabled');
    }

    const cleanedContent = processedContent
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') 
      .replace(/\\/g, '\\\\') 
      .substring(0, 100000); 

    console.log(`Final content length: ${cleanedContent.length} characters`);

    const { error: updateError } = await supabaseClient
      .from('module_content')
      .update({
        processed_content: cleanedContent,
        processing_status: 'completed',
        processed_date: new Date().toISOString()
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update processed content: ${updateError.message}`);
    }

    if (moduleId && (generatedTitle || generatedDescription) && !enhancedProcessing) {
      console.log('Updating module with enhanced AI-generated metadata...');
      
      const moduleUpdates = {};
      if (generatedTitle) moduleUpdates.name = generatedTitle;
      if (generatedDescription) moduleUpdates.description = generatedDescription;
      
      const { error: moduleUpdateError } = await supabaseClient
        .from('modules')
        .update(moduleUpdates)
        .eq('id', moduleId);

      if (moduleUpdateError) {
        console.error('Failed to update module metadata:', moduleUpdateError);
      } else {
        console.log('Successfully updated module with enhanced AI-generated metadata');
      }
    }

    console.log('Enhanced content processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: enhancementUsed 
          ? 'Content processed successfully with enhanced NotebookLLM-style enhancement'
          : 'Content processed successfully (no AI enhancement)',
        usedAI: enhancementUsed,
        contentLength: cleanedContent.length,
        generatedTitle: generatedTitle,
        generatedDescription: generatedDescription ? generatedDescription.slice(0, 100) + '...' : null,
        enhancedProcessing: enhancedProcessing
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing module content:', error);
    
    try {
      const supabaseClient = createClient(
        DENO_ENV_GET('SUPABASE_URL') ?? '',
        DENO_ENV_GET('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('module_content')
        .update({ processing_status: 'failed' })
        .eq('id', contentId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function analyzeContentStructure(text) {
  const lowerContent = text.toLowerCase();
  
  // Detect subject area
  const subjects = {
    'algorithms': ['algorithm', 'sorting', 'searching', 'complexity', 'big o', 'recursion', 'dynamic programming'],
    'data structures': ['array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'hash', 'heap'],
    'programming': ['function', 'variable', 'class', 'object', 'loop', 'condition', 'syntax', 'debug'],
    'web development': ['html', 'css', 'javascript', 'react', 'frontend', 'backend', 'api', 'rest'],
    'databases': ['sql', 'query', 'table', 'database', 'index', 'join', 'transaction', 'schema'],
    'machine learning': ['neural network', 'training', 'model', 'dataset', 'prediction', 'classification'],
    'software engineering': ['design pattern', 'architecture', 'testing', 'agile', 'scrum', 'deployment']
  };

  let detectedSubject = 'computer science';
  let maxScore = 0;

  for (const [subject, keywords] of Object.entries(subjects)) {
    const score = keywords.reduce((acc, keyword) => {
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }

  // Extract topics from headings and emphasized text
  const topics = [];
  const headingPatterns = [
    /^[A-Z][A-Za-z\s]{3,50}$/gm,
    /^\d+\.?\s+[A-Z][A-Za-z\s]{3,50}$/gm,
    /^Chapter\s+\d+[:\s]+[A-Za-z\s]{3,50}$/gm
  ];

  headingPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    topics.push(...matches.slice(0, 10));
  });

  // Determine content type
  const contentTypeIndicators = {
    'theoretical': ['theory', 'concept', 'principle', 'overview'],
    'practical': ['example', 'implementation', 'code', 'practice'],
    'tutorial': ['step', 'guide', 'how to', 'tutorial'],
    'reference': ['reference', 'documentation', 'api', 'manual']
  };

  let contentType = 'educational material';
  let maxTypeScore = 0;

  for (const [type, indicators] of Object.entries(contentTypeIndicators)) {
    const score = indicators.reduce((acc, indicator) => {
      return acc + (lowerContent.includes(indicator) ? 1 : 0);
    }, 0);

    if (score > maxTypeScore) {
      maxTypeScore = score;
      contentType = type;
    }
  }

  // Assess difficulty
  const beginnerIndicators = ['introduction', 'basic', 'fundamentals', 'getting started'];
  const advancedIndicators = ['advanced', 'complex', 'optimization', 'sophisticated'];

  const beginnerScore = beginnerIndicators.reduce((acc, word) => acc + (lowerContent.includes(word) ? 1 : 0), 0);
  const advancedScore = advancedIndicators.reduce((acc, word) => acc + (lowerContent.includes(word) ? 1 : 0), 0);

  let difficulty = 'intermediate';
  if (beginnerScore > advancedScore) difficulty = 'beginner';
  else if (advancedScore > beginnerScore) difficulty = 'advanced';

  return {
    subject: detectedSubject,
    topics: topics.slice(0, 10),
    concepts: [],
    contentType: contentType,
    difficulty: difficulty
  };
}

function truncateText(text, maxTokens) {
  const maxChars = maxTokens * 4;
  
  if (text.length <= maxChars) {
    return text;
  }

  const paragraphs = text.split('\n\n');
  let truncated = '';
  
  for (const paragraph of paragraphs) {
    if ((truncated + paragraph).length > maxChars) {
      break;
    }
    truncated += paragraph + '\n\n';
  }
  
  if (!truncated.trim()) {
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxChars) {
        break;
      }
      truncated += sentence + '.';
    }
  }
  
  return truncated.trim() + '\n\n[Content truncated due to length for AI processing...]';
}
