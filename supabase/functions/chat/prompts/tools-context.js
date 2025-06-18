
export function buildToolsContext(tools) {
  if (tools.length === 0) {
    return '';
  }
  
  return '\n\n🔧 TOOLS: Use for very specific technical questions only. Keep responses focused and ask questions about results.';
}
