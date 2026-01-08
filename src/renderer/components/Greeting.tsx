import React from 'react';
import './Greeting.css';

interface GreetingProps {
  userName: string;
  statusMessage?: string;
}

/**
 * Greeting Component - Clinical Zen Empty State
 * Displays a welcoming message when no conversation is active
 */
export const Greeting: React.FC<GreetingProps> = ({ 
  userName, 
  statusMessage = 'System Secure & Offline' 
}) => {
  return (
    <div className="greeting">
      <div className="greeting__icon">
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1 className="greeting__title">Good morning, {userName}</h1>
      <p className="greeting__subtitle">
        Your clinical assistant is ready. Dictate notes, query records, or ask for help with documentation.
      </p>
      <span className="greeting__status">{statusMessage}</span>
    </div>
  );
};

export default Greeting;
