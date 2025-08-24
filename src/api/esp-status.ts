// ESP Connection Status API endpoint
// This endpoint will be accessible at /api/esp-status

export default function handler(req, res) {
  // Check if this is running in the browser context
  if (typeof window !== 'undefined') {
    const status = (window as any).espConnectionStatus || {
      esp_connection_enabled: true,
      timestamp: new Date().toISOString(),
      message: "ESP nodes are allowed to send data"
    };
    
    res.status(200).json(status);
  } else {
    // Server-side fallback
    try {
      const localStorageValue = req.cookies?.esp_connection_enabled;
      const enabled = localStorageValue ? JSON.parse(localStorageValue) : true;
      
      const status = {
        esp_connection_enabled: enabled,
        timestamp: new Date().toISOString(),
        message: enabled 
          ? "ESP nodes are allowed to send data" 
          : "ESP nodes should stop sending data"
      };
      
      res.status(200).json(status);
    } catch (error) {
      res.status(200).json({
        esp_connection_enabled: true,
        timestamp: new Date().toISOString(),
        message: "ESP nodes are allowed to send data (default)"
      });
    }
  }
}
