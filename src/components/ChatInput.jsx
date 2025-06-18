import React from 'react';

const ChatInput = ({ 
  input, 
  setInput, 
  onSubmit, 
  isLoading, 
  inputRef, 
  onHintMe, 
  onBuildQuestion, 
  activeModule 
}) => {
  return (
    <div className="bottom-container bg-[#022222] z-[1000] flex flex-col items-center py-4 gap-2 border-t-[0.9px] border-[#0fcabb] fixed bottom-0 left-0 right-0">
      <form onSubmit={onSubmit} className="w-full max-w-[600px] mx-auto px-4">
        <div className="chat-box flex flex-col w-full border-[0.9px] border-[#0fcabb] rounded-[20px] overflow-hidden">
          <input 
            type="text" 
            id="user-input" 
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={
              activeModule 
                ? `Ask about ${activeModule.name}...`
                : "Type a question here..."
            }
            className="w-full bg-transparent border-none font-mono text-[#72f0df] text-base outline-none p-3 pr-10 placeholder:text-[#0fcabb] placeholder:opacity-70 placeholder:italic placeholder:text-sm"
            disabled={isLoading}
          />
          <div className="button-row flex justify-end border-t-[0.5px] border-[#0fcabb] overflow-hidden gap-[0.2em] p-[0.2em] rounded-tl-[20px] rounded-tr-[20px]">
            <button 
              type="button"
              onClick={onHintMe}
              disabled={isLoading}
              className="bg-transparent border-[0.1px] border-[#64ffda] text-[#64ffda] font-mono py-2 px-3 rounded-none cursor-pointer transition-all duration-300 hover:bg-[#0fcabb22] flex items-center gap-1 text-sm m-0 rounded-l-[20px]"
            >
              <span className="material-icons text-[#64ffda] text-sm">lightbulb</span>
              <span>Hint me</span>
            </button>
            <button 
              type="button"
              onClick={onBuildQuestion}
              disabled={isLoading}
              className="bg-transparent border-[0.1px] border-[#64ffda] text-[#64ffda] font-mono py-2 px-3 rounded-none cursor-pointer transition-all duration-300 hover:bg-[#0fcabb22] flex items-center gap-1 text-sm m-0"
            >
              <span className="material-icons text-[#64ffda] text-sm">build</span>
              <span>Build my question</span>
            </button>
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-transparent border-[0.1px] border-[#64ffda] text-[#64ffda] font-['Anonymous_Pro'] py-2 px-3 rounded-none cursor-pointer transition-all duration-300 hover:bg-[#0fcabb22] flex items-center justify-center text-sm m-0 max-w-[3em] text-center rounded-r-[20px]"
            >
              <span className="material-icons text-[#64ffda] text-sm">send</span>
            </button>
          </div>
        </div>
      </form>
      <p className="disclaimer text-[#a0dad3] text-[0.8em] text-center mt-4 mb-4 font-['Anonymous_Pro']">
        {activeModule 
          ? `Teaching assistant for ${activeModule.name}. Questions outside this module may not be answered.`
          : "This AI may make mistakes. Proceed with caution."
        }
      </p>
    </div>
  );
};

export default ChatInput;
