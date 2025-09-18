// Gemini API service with alternating API key management

interface TimeRange {
  label: string;
  value: string;
  minutes: number;
}

export const TIME_RANGES: TimeRange[] = [
  { label: "Last 2 minutes", value: "2min", minutes: 2 },
  { label: "Last 5 minutes", value: "5min", minutes: 5 },
  { label: "Last 15 minutes", value: "15min", minutes: 15 },
  { label: "Last 30 minutes", value: "30min", minutes: 30 },
  { label: "Last 1 hour", value: "1hr", minutes: 60 },
  { label: "Last 3 hours", value: "3hr", minutes: 180 },
  { label: "Last 6 hours", value: "6hr", minutes: 360 },
  { label: "Last 12 hours", value: "12hr", minutes: 720 },
  { label: "Last 24 hours", value: "1day", minutes: 1440 },
  { label: "Last 3 days", value: "3days", minutes: 4320 },
  { label: "Last 7 days", value: "7days", minutes: 10080 }
];

class GeminiService {
  private primaryApiKey: string;
  private fallbackApiKey: string;
  private currentApiIndex: number = 0;
  
  constructor() {
    this.primaryApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.fallbackApiKey = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY || '';
    
    // Load the last used API index from localStorage
    const stored = localStorage.getItem('gemini_api_index');
    this.currentApiIndex = stored ? parseInt(stored) : 0;
  }

  // Get the current API key and rotate for next use
  getCurrentApiKey(): { apiKey: string; keyName: string } {
    const apiKeys = [
      { key: this.primaryApiKey, name: 'Primary API (Ajinkya)' },
      { key: this.fallbackApiKey, name: 'Fallback API (Anistark1014)' }
    ].filter(api => api.key); // Filter out empty keys

    if (apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

    const current = apiKeys[this.currentApiIndex % apiKeys.length];
    
    // Rotate to next API key for alternating pattern
    this.currentApiIndex = (this.currentApiIndex + 1) % apiKeys.length;
    localStorage.setItem('gemini_api_index', this.currentApiIndex.toString());
    
    return { apiKey: current.key, keyName: current.name };
  }

  // Reset API rotation (useful for testing)
  resetApiRotation(): void {
    this.currentApiIndex = 0;
    localStorage.setItem('gemini_api_index', '0');
  }

  // Get API usage stats
  getApiStats(): { 
    totalKeys: number; 
    currentIndex: number; 
    nextKeyName: string;
  } {
    const apiKeys = [
      { key: this.primaryApiKey, name: 'Primary API' },
      { key: this.fallbackApiKey, name: 'Fallback API' }
    ].filter(api => api.key);

    return {
      totalKeys: apiKeys.length,
      currentIndex: this.currentApiIndex,
      nextKeyName: apiKeys[this.currentApiIndex % apiKeys.length]?.name || 'Unknown'
    };
  }

  // Filter farm data based on time range
  filterDataByTimeRange(farmData: any[], timeRange: string): any[] {
    const selectedRange = TIME_RANGES.find(range => range.value === timeRange);
    if (!selectedRange) {
      return farmData; // Return all data if no valid range
    }

    const cutoffTime = new Date(Date.now() - selectedRange.minutes * 60 * 1000);
    
    return farmData.filter(data => {
      const dataTime = new Date(data.timestamp);
      return dataTime >= cutoffTime;
    });
  }

  // Generate analysis summary for selected time range
  generateTimeRangeSummary(filteredData: any[], timeRange: string): string {
    const range = TIME_RANGES.find(r => r.value === timeRange);
    if (!filteredData.length) {
      return `No data available for the ${range?.label.toLowerCase() || 'selected time period'}.`;
    }

    const latest = filteredData[filteredData.length - 1];
    const oldest = filteredData[0];
    const duration = new Date(latest.timestamp).getTime() - new Date(oldest.timestamp).getTime();
    const actualMinutes = Math.round(duration / (1000 * 60));

    return `
    TIME RANGE ANALYSIS: ${range?.label || timeRange}
    - Data Points: ${filteredData.length} readings
    - Actual Duration: ${actualMinutes} minutes
    - Data Range: ${new Date(oldest.timestamp).toLocaleString()} to ${new Date(latest.timestamp).toLocaleString()}
    - Analysis Focus: Trends and patterns within this specific timeframe
    `;
  }
}

export const geminiService = new GeminiService();