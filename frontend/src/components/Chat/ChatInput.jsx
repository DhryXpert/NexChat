import { useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';

export default function ChatInput({ onSend, disabled }) {
  const inputRef = useRef(null);

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [autoResize]);

  // Refocus the input box whenever it gets re-enabled (e.g. streaming completes)
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (disabled) return; // Prevent sending while AI is streaming
    const content = inputRef.current?.value?.trim();
    if (!content) return;
    onSend(content);
    if (inputRef.current) {
      inputRef.current.value = '';
      autoResize();
      // Keep focus in the input box immediately after sending
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) {
        handleSend();
      }
    }
  };

  return (
    <div id="input-area">
      <div className="input-wrapper">
        <textarea
          ref={inputRef}
          id="chat-input"
          placeholder="Reply to NexChat..."
          rows={1}
          aria-label="Chat input"
          autoComplete="off"
          spellCheck="true"
          onInput={autoResize}
          onKeyDown={handleKeyDown}
        />
        
        {/* P1: Action icons sit inside the bottom row of the input container */}
        <div className="input-wrapper__bottom-row">
          <div className="input-wrapper__actions-left">
            <button 
              type="button" 
              className="input-action-btn" 
              title="Attach files (decorative)" 
            >
              <Paperclip size={16} />
            </button>
          </div>
          
          <button
            id="send-btn"
            aria-label="Send message"
            title="Send (Enter)"
            disabled={disabled}
            className={disabled ? 'send-btn--loading' : ''}
            onClick={handleSend}
          >
            {disabled ? (
              <div className="spinner" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>
      <p className="input-hint">AI can make mistakes. Verify important info.</p>
    </div>
  );
}


