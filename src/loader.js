/**
 * OVG Engage Chat Widget Loader
 * White-label, plug-and-play embed script
 * 
 * Usage:
 * 1. Set configuration (optional):
 *    <script>
 *      window.ovgConfig = {
 *        tenant: { name: "Your Business Name", location: "Your Location" },
 *        branding: { primaryColor: "#your-color" }
 *      };
 *    </script>
 * 
 * 2. Load the widget:
 *    <script src="https://your-domain.com/loader.js"></script>
 * 
 * Security:
 * - Domain whitelisting (configure allowedDomains in ovgConfig)
 * - Shadow DOM isolation
 * - Double-load protection
 */
(function() {
  'use strict';

  // Prevent double-loading
  if (window.__ovgWidgetLoaded) {
    console.warn('OVG Engage Widget: Already loaded');
    return;
  }

  // ============================================
  // SECURITY: Domain Validation
  // ============================================
  const getDomain = () => window.location.hostname.replace('www.', '');
  
  // Default allowed domains (can be overridden via window.ovgConfig.allowedDomains)
  const DEFAULT_ALLOWED_DOMAINS = [
    'ovg-engage.vercel.app',  // Main demo site
    'localhost',               // Local development
    '127.0.0.1'               // Local development
  ];

  // Get user-configured allowed domains
  const userAllowedDomains = (window.ovgConfig && window.ovgConfig.allowedDomains) || [];
  const allowedDomains = [...DEFAULT_ALLOWED_DOMAINS, ...userAllowedDomains];

  // Validate current domain
  const currentDomain = getDomain();
  if (!allowedDomains.includes(currentDomain)) {
    console.error('🔒 OVG Engage Widget: Unauthorized domain detected:', currentDomain);
    console.error('🔒 Please add this domain to allowedDomains in your configuration.');
    return; // Block loading on unauthorized domains
  }

  window.__ovgWidgetLoaded = true;

  // Default configuration
  const DEFAULT_CONFIG = {
    widgetUrl: 'https://ovg-engage.vercel.app',
    containerId: 'ovg-chat-widget',
    shadowDomMode: true,
    // Security settings
    allowedDomains: allowedDomains
  };

  // Merge with user-provided config
  const userConfig = window.ovgConfig || {};
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Initialize widget container
  function initWidget() {
    // Check if container already exists
    let container = document.getElementById(config.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = config.containerId;
      document.body.appendChild(container);
    }

    // Use Shadow DOM for style isolation (prevents CSS conflicts)
    if (config.shadowDomMode && container.attachShadow) {
      const shadow = container.attachShadow({ mode: 'open' });
      
      // Create render target inside shadow DOM
      const renderTarget = document.createElement('div');
      renderTarget.id = 'ovg-chat-root';
      renderTarget.style.all = 'initial';
      shadow.appendChild(renderTarget);

      // Load widget styles
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = config.widgetUrl + '/src/index.css';
      shadow.appendChild(styleLink);

      console.log('✅ OVG Engage Chat Widget loaded (Shadow DOM mode)');
    } else {
      // Fallback: render directly in container
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.zIndex = '9999';
      
      console.log('✅ OVG Engage Chat Widget loaded (inline mode)');
    }

    // Dispatch custom event for widget initialization
    window.dispatchEvent(new CustomEvent('ovg-widget-ready', { detail: config }));
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Log loading status
  console.log('🎨 OVG Engage Widget Loader initialized');
  if (window.ovgConfig) {
    console.log('📋 Custom configuration detected:', window.ovgConfig);
  }
})();