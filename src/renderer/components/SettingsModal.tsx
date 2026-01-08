import React, { useState } from 'react';
import './SettingsModal.css';

export type SettingsTab = 'general' | 'models' | 'providers' | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialTab?: SettingsTab;
}

/**
 * SettingsModal Component - Clinical Zen Settings Panel
 * Modal overlay with tabbed navigation for app settings
 * Requirements: 14.1-14.4, 14.8, 14.9, 14.10
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'models', label: 'Models' },
    { id: 'providers', label: 'Providers' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="settings-modal__backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-modal__header">
          <h2 id="settings-title" className="settings-modal__title">Settings</h2>
          <button
            className="settings-modal__close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="settings-modal__tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`settings-modal__tab ${activeTab === tab.id ? 'settings-modal__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="settings-modal__content">
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={activeTab}
            className="settings-modal__panel"
          >
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'models' && <ModelsTab />}
            {activeTab === 'providers' && <ProvidersTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>

        <div className="settings-modal__footer">
          <button
            className="settings-modal__btn settings-modal__btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="settings-modal__btn settings-modal__btn--save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder tab components - to be implemented in future tasks
const GeneralTab: React.FC = () => (
  <div className="settings-tab">
    <h3 className="settings-tab__heading">General Settings</h3>
    <p className="settings-tab__description">Configure general application preferences.</p>
  </div>
);

const ModelsTab: React.FC = () => (
  <div className="settings-tab">
    <h3 className="settings-tab__heading">AI Models</h3>
    <p className="settings-tab__description">Manage AI model downloads and configurations.</p>
  </div>
);

const ProvidersTab: React.FC = () => (
  <div className="settings-tab">
    <h3 className="settings-tab__heading">Providers</h3>
    <p className="settings-tab__description">Configure AI providers and API connections.</p>
  </div>
);

const AboutTab: React.FC = () => (
  <div className="settings-tab">
    <h3 className="settings-tab__heading">About GoatedApp</h3>
    <p className="settings-tab__description">
      A privacy-first clinical orchestration platform.
    </p>
    <div className="settings-tab__info">
      <p>Version: 1.0.0</p>
      <p>All patient data remains on-device.</p>
    </div>
  </div>
);

export default SettingsModal;
