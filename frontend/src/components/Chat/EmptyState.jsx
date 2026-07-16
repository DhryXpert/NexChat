import { Lightbulb, PenTool, Code, Globe } from 'lucide-react';

const SUGGESTIONS = [
  { Icon: Lightbulb, text: 'Explain quantum computing in simple terms' },
  { Icon: PenTool, text: 'Write a short poem about the ocean' },
  { Icon: Code, text: 'What are the best coding practices in JavaScript?' },
  { Icon: Globe, text: 'Give me a fun fact about space' },
];

export default function EmptyState({ onSendPrompt }) {
  return (
    <div className="empty-state">
      <div className="empty-state__logo">
        <img src="/logo.svg" alt="NexChat logo" width="64" height="64" />
      </div>
      <h2 className="empty-state__title">How can I help you today?</h2>
      <p className="empty-state__sub">Type a message below or choose a prompt to get started.</p>
      <div className="empty-state__prompts">
        {SUGGESTIONS.map((prompt) => {
          const PromptIcon = prompt.Icon;
          return (
            <button
              key={prompt.text}
              className="prompt-card"
              onClick={() => onSendPrompt(prompt.text)}
            >
              <span className="prompt-card__icon" style={{ display: 'flex', color: 'var(--clr-accent-2)' }}>
                <PromptIcon size={16} />
              </span>
              <span className="prompt-card__text">{prompt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

