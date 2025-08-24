// ESP Connection Status API endpoint
// This endpoint will be accessible at /api/esp-status

export default function handler(req, res) {
  // Check if this is running in the browser context
  if (typeof window !== 'undefined') {
    const collectionMode = localStorage.getItem('data_collection_mode') || 'stopped';
    const enabled = collectionMode !== 'stopped';
    
    const status = {
      esp_connection_enabled: enabled,
      data_collection_enabled: enabled,
      collection_mode: collectionMode,
      timestamp: new Date().toISOString(),
      message: collectionMode === 'stopped' 
        ? "Data collection stopped - ESP nodes should not send data to database"
        : collectionMode === 'collecting'
        ? "Data collection active - ESP nodes should send data to database"
        : "Continuous data collection - ESP nodes should continuously send data to database"
    };
    
    res.status(200).json(status);
  } else {
    // Server-side fallback
    try {
      const collectionMode = req.cookies?.data_collection_mode || 'stopped';
      const enabled = collectionMode !== 'stopped';
      
      const status = {
        esp_connection_enabled: enabled,
        data_collection_enabled: enabled,
        collection_mode: collectionMode,
        timestamp: new Date().toISOString(),
        message: collectionMode === 'stopped' 
          ? "Data collection stopped - ESP nodes should not send data to database"
          : collectionMode === 'collecting'
          ? "Data collection active - ESP nodes should send data to database"
          : "Continuous data collection - ESP nodes should continuously send data to database"
      };
      
      res.status(200).json(status);
    } catch (error) {
      res.status(200).json({
        esp_connection_enabled: false,
        data_collection_enabled: false,
        collection_mode: "stopped",
        timestamp: new Date().toISOString(),
        message: "Data collection stopped - ESP nodes should not send data to database (default)"
      });
    }
  }
}
