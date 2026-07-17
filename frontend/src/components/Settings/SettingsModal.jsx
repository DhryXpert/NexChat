import { useState, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';

export default function SettingsModal({ isOpen, settings, onSave, onClose, onClearChats }) {
  const [model, setModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [topP, setTopP] = useState(settings.topP);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);

  // Sync when settings prop changes
  useEffect(() => {
    setModel(settings.model);
    setTemperature(settings.temperature);
    setTopP(settings.topP);
    setMaxTokens(settings.maxTokens);
    setSystemPrompt(settings.systemPrompt);
  }, [settings]);

  const handleSave = () => {
    onSave({ model, temperature, topP, maxTokens, systemPrompt });
    onClose();
  };

  const handleClear = () => {
    if (window.confirm('Delete ALL conversations? This cannot be undone.')) {
      onClearChats();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="settings-modal"
      className="modal--open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target.id === 'settings-modal') onClose(); }}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" id="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} />
            <span>Settings</span>
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="modal__body">
          {/* Model Selection */}
          <div className="field">
            <label className="field__label" htmlFor="settings-model">Model</label>
            <select id="settings-model" value={model} onChange={(e) => setModel(e.target.value)} disabled>
              <option value="google/gemma-2-2b-it">NVIDIA</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="field">
            <label className="field__label">Temperature</label>
            <div className="slider-row">
              <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
              <span className="slider-value">{temperature.toFixed(1)}</span>
            </div>
            <span className="field__sub">Lower = more focused & factual · Higher = more creative</span>
          </div>

          {/* Top P */}
          <div className="field">
            <label className="field__label">Top P</label>
            <div className="slider-row">
              <input type="range" min="0.1" max="1" step="0.1" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} />
              <span className="slider-value">{topP.toFixed(1)}</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="field">
            <label className="field__label" htmlFor="settings-max-tokens">Max Tokens</label>
            <select id="settings-max-tokens" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))}>
              <option value={512}>512 — Short responses</option>
              <option value={1024}>1024 — Balanced</option>
              <option value={2048}>2048 — Long responses</option>
              <option value={4096}>4096 — Very long</option>
            </select>
          </div>

          {/* System Prompt */}
          <div className="field">
            <label className="field__label" htmlFor="settings-system-prompt">System Prompt</label>
            <textarea
              id="settings-system-prompt"
              placeholder="You are NexChat, a helpful AI assistant."
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--danger" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trash2 size={14} />
            <span>Clear All Chats</span>
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave}>Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
