import React from 'react';
import './ConnectToolButton.css';

interface ConnectToolButtonProps {
  onClick: () => void;
  connectedCount: number;
}

/**
 * ConnectToolButton Component - Aesthetic "+" button for MCP server connection
 * Positioned in top-right corner of main content area
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export const ConnectToolButton: React.FC<ConnectToolButtonProps> = ({
  onClick,
  connectedCount,
}) => {
  return (
    <button
      className="connect-tool-btn"
      onClick={onClick}
      aria-label="Connect Tool"
      title="Connect MCP Server"
    >
      <div className="connect-tool-btn__icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <span className="connect-tool-btn__label">Connect Tool</span>
      {connectedCount > 0 && (
        <span className="connect-tool-btn__badge">{connectedCount}</span>
      )}
    </button>
  );
};

export default ConnectToolButton;
