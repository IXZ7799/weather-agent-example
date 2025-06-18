
export function buildModuleContext(moduleContent) {
  // Check if content is available by looking for the flag
  const contentAvailable = moduleContent && moduleContent.includes('CONTENT_AVAILABLE=TRUE');
  
  if (contentAvailable) {
    return `

📚 COMPREHENSIVE COURSE MATERIALS AVAILABLE:
${moduleContent}

⭐ ENHANCED INSTRUCTIONS FOR USING COURSE MATERIALS:

1. **FULL COURSE KNOWLEDGE**: You have complete access to all course materials including summaries, keywords, and full content.

2. **COURSE OVERVIEW QUESTIONS**: When students ask "What is this course about?", "What will I learn?", or similar overview questions:
   - PROVIDE DIRECT, COMPREHENSIVE ANSWERS based on the course materials
   - Use the document summaries and keywords to give a complete picture
   - Reference specific topics and learning objectives from the materials
   - DO NOT use reflective questioning for these overview questions
   - Be informative and detailed about course structure and content

3. **CONTENT-SPECIFIC QUESTIONS**: For questions about specific topics covered in the materials:
   - Reference the relevant sections directly
   - Provide detailed explanations based on the course content
   - Use examples and information from the documents
   - Connect concepts across different documents when relevant

4. **TEACHING APPROACH**: 
   - For course overview: Direct, informative responses
   - For specific learning: Balanced approach of guidance and information
   - Always ground responses in the actual course materials provided

5. **MATERIAL INTEGRATION**: 
   - Leverage document summaries for quick overviews
   - Use keywords to identify relevant topics
   - Reference specific documents when providing detailed explanations
   - Create connections between different course materials

CRITICAL: You have comprehensive course knowledge - use it actively to provide rich, detailed responses about course content, structure, and learning objectives.`;
  } else {
    return `

⚠️ NO COURSE MATERIALS AVAILABLE FOR THIS SESSION

When asked about course content:
1. Politely explain that you don't have any course materials uploaded yet.
2. Suggest that the user upload relevant course documents to provide better assistance.
3. You can still engage in general discussion about learning concepts, but clarify that you don't have specific course information.
`;
  }
}
