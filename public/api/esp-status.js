// Simple API endpoint to provide ESP connection status
// This file will be served by the web server and provide status to ESP nodes

// Check localStorage for connection status (this will be accessible when served as static content)
const checkConnectionStatus = () => {
  try {
    // This would be read from backend storage or configuration
    // For simplicity, we'll return enabled by default
    // In production, this should check a database or configuration file
    return { 
      enabled: true, 
      timestamp: new Date().toISOString(),
      message: "ESP connection is enabled"
    };
  } catch (error) {
    return { 
      enabled: false, 
      timestamp: new Date().toISOString(),
      message: "Error checking connection status"
    };
  }
};

// If this is being called as an API endpoint
if (typeof module !== 'undefined' && module.exports) {
  module.exports = checkConnectionStatus;
} else {
  // If called directly in browser context
  document.addEventListener('DOMContentLoaded', () => {
    const status = checkConnectionStatus();
    document.body.innerHTML = JSON.stringify(status);
    document.body.style.fontFamily = 'monospace';
    document.body.style.whiteSpace = 'pre-wrap';
  });
}
