import React from 'react';
import './InputArea.css';

interface InputAreaProps {
  isListening: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicClick: () => void;
  onAttachClick?: () => void;
  disabled?: boolean;
}

/**
 * InputArea Component - Clinical Zen Floating Input Bar
 * Floating pill-style input bar with text input and microphone button
 */
export const InputArea: React.FC<InputAreaProps> = ({
  isListening,
  value,
  onChange,
  onSubmit,
  onMicClick,
  onAttachClick,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="input-area">
      <div className="input-area__container">
        <div className={`input-area__box ${isListening ? 'input-area__box--listening' : ''} ${disabled ? 'input-area__box--disabled' : ''}`}>
          <textarea
            className="input-area__textarea"
            placeholder={disabled ? "Waiting for response..." : "Dictate command or type..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
          />
          <div className="input-area__actions">
            <button 
              className="input-area__attach-btn" 
              onClick={onAttachClick}
              type="button"
              aria-label="Attach file"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              className={`input-area__mic-btn ${isListening ? 'input-area__mic-btn--listening' : 'input-area__mic-btn--idle'}`}
              onClick={onMicClick}
              type="button"
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 10v3a8 8 0 0016 0v-3" />
                    <line x1="6" y1="6" x2="6" y2="18" />
                    <line x1="10" y1="3" x2="10" y2="21" />
                    <line x1="14" y1="6" x2="14" y2="18" />
                    <line x1="18" y1="10" x2="18" y2="14" />
                  </svg>
                  <span className="input-area__mic-text">Listening...</span>
                </>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <p className="input-area__disclaimer">
          Patient data remains local. AI may display generated content.
        </p>
      </div>
    </div>
  );
};

export default InputArea;
