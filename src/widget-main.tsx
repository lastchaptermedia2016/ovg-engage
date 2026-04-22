import React from 'react';
import ReactDOM from 'react-dom/client';
import EngageWidget from './components/EngageWidget';

// Extract tenant ID from script tag
const script = document.currentScript as HTMLScriptElement;
const tenantId = script?.getAttribute('data-tenant') || 'default';

// Fetch widget configuration from Supabase
const fetchWidgetConfig = async (tenantId: string) => {
  try {
    const response = await fetch(`/api/widget-config?tenant=${tenantId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch widget config');
    }
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('Error fetching widget config:', error);
    // Return default config
    return {
      brandColors: {
        primary: '#0097b2',
        secondary: '#226683',
        accent: '#D4AF37'
      },
      systemInstructions: 'You are a helpful AI assistant.',
      voice_enabled: false,
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      initial_greeting: 'Hello! How can I help you today?'
    };
  }
};

// Initialize widget with Shadow DOM
const initWidget = async () => {
  const config = await fetchWidgetConfig(tenantId);

  // Create host element for Shadow DOM
  const host = document.createElement('div');
  host.id = 'engage-widget-host';
  document.body.appendChild(host);

  // Create Shadow DOM
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create container for widget inside Shadow DOM
  const container = document.createElement('div');
  container.id = 'engage-widget-root';
  shadowRoot.appendChild(container);

  // Inject Tailwind CSS into Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }
    .transition-all {
      transition-property: all;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 300ms;
    }
    .hover\\:scale-110:hover {
      transform: scale(1.1);
    }
    .hover\\:opacity-90:hover {
      opacity: 0.9;
    }
    .hover\\:scale-105:hover {
      transform: scale(1.05);
    }
    .disabled\\:opacity-50:disabled {
      opacity: 0.5;
    }
    .backdrop-blur-sm {
      backdrop-filter: blur(4px);
    }
    .backdrop-blur-10 {
      backdrop-filter: blur(10px);
    }
  `;
  shadowRoot.appendChild(style);

  // Render widget
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <EngageWidget
        tenantId={tenantId}
        brandColors={config.brandColors}
        systemInstructions={config.systemInstructions}
        initialGreeting={config.initial_greeting}
      />
    </React.StrictMode>
  );
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
