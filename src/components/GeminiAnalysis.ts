import { globalThresholdService } from '@/lib/globalThresholdService';
import { weatherService, getUserLocation, WeatherData, WeatherValidation } from '@/lib/weatherService';
import { geminiService } from '@/lib/geminiService';

export async function getAnalysis(farmData: any[], timeRange: string = '1hr') {
  try {
    // Get current API key using alternating pattern
    const { apiKey, keyName } = geminiService.getCurrentApiKey();
    console.log(`🤖 Using ${keyName} for analysis`);

    // Filter data based on selected time range
    const filteredData = geminiService.filterDataByTimeRange(farmData, timeRange);
    const timeRangeSummary = geminiService.generateTimeRangeSummary(filteredData, timeRange);

    // Get current threshold settings and selected crop
    const thresholds = globalThresholdService.getCurrentThresholds();
    const currentPreset = globalThresholdService.getCurrentPreset();
    
    // Get weather data for validation
    let weatherData: WeatherData | null = null;
    let weatherValidation: WeatherValidation | null = null;
    let weatherContext = '';
    
    try {
      const location = await getUserLocation();
      weatherData = await weatherService.getCurrentWeather(location.lat, location.lon);
      
    // Validate sensor data against weather API if we have recent sensor data
    if (filteredData.length > 0) {
      const latestSensorData = filteredData[filteredData.length - 1];
      weatherValidation = await weatherService.validateSensorData(
        {
          temperature: latestSensorData.temperature || latestSensorData.air_temperature,
          humidity: latestSensorData.humidity || latestSensorData.air_humidity
        },
        location.lat,
        location.lon
      );
    }      weatherContext = `
                  EXTERNAL WEATHER DATA (for validation):
                  - Location: ${weatherData.location.name}, ${weatherData.location.country}
                  - External Temperature: ${weatherData.temperature}°C
                  - External Humidity: ${weatherData.humidity}%
                  - Weather: ${weatherData.description}
                  - Wind Speed: ${weatherData.windSpeed} m/s
                  - Cloud Cover: ${weatherData.cloudCover}%
                  ${weatherValidation ? `
                  SENSOR DATA VALIDATION:
                  - Sensor Reliability: ${weatherValidation.sensorReliability}
                  - Temperature Difference: ${weatherValidation.temperatureDiff.toFixed(1)}°C
                  - Humidity Difference: ${weatherValidation.humidityDiff.toFixed(1)}%
                  - Validation Notes: ${weatherValidation.recommendations.join(', ')}` : ''}`;
    } catch (error) {
      console.warn('Weather data unavailable:', error);
      weatherContext = '\n                  EXTERNAL WEATHER DATA: Not available - proceeding with sensor data only';
    }
    
    // Build dynamic threshold text
    const thresholdText = Object.entries(thresholds).map(([key, threshold]) => {
      const sensorName = threshold.label || key;
      return `- ${sensorName}: ${threshold.low}-${threshold.high}${threshold.unit} (critical below ${threshold.low}${threshold.unit} or above ${threshold.high}${threshold.unit})`;
    }).join('\n                  ');
    
    // Add crop-specific context
    const cropContext = currentPreset 
      ? `\n                  CURRENT CROP PRESET: ${currentPreset}\n                  Please provide analysis and recommendations specific to ${currentPreset} cultivation.`
      : '\n                  No specific crop preset selected. Provide general polyhouse farming analysis.';
    
    const safeData = JSON.stringify(filteredData.slice(-10)); // last 10 readings from filtered data

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
                  Analyze this farm sensor data and return JSON ONLY in the exact format below. Make the farm_health score highly sensitive and precise to the actual data received. Provide clear, descriptive labels that indicate whether LOW/HIGH values are good or bad.
                  No explanations, no extra text. Include timestamps and exact values for any significant changes.
                  
                  ${timeRangeSummary}
                  
                  CURRENT CONFIGURED THRESHOLD VALUES FOR THIS FARM:
                  ${thresholdText}
                  ${cropContext}
                  ${weatherContext}
                  
                  NOTE: These thresholds are user-configured and should be used as the reference for optimal/warning/critical ranges.
                  Use external weather data to validate sensor readings and improve reliability assessment.

                  FORMAT REQUIREMENTS:
                  - For indices, use descriptive labels like "Heat Stress Risk" instead of just "Heat Stress"
                  - Include risk levels (Low Risk, Moderate Risk, High Risk) or status (Good, Fair, Poor)
                  - Make values intuitive (higher numbers = better for positive metrics, lower = better for risk metrics)
                  - If a specific crop is mentioned, tailor all recommendations to that crop's specific needs
                  - Use weather validation data to assess sensor reliability more accurately
                  
                  {
                    "farm_health": { 
                      "score": number, 
                      "status": "string", 
                      "tags": ["string"] 
                    },
                    "alerts": [ { "type": "string", "message": "string", "recommendation": "string" } ],
                    "trends": ["string"],
                    "recommendations": ["string"],
                    "forecast": {
                      "soil_moisture_next_3h": { "label": "string", "icon": "emoji or string", "value": "string" },
                      "air_temp_next_3h": { "label": "string", "icon": "emoji or string", "value": "string" }
                    },
                    "indices": {
                      "heat_stress_index": { "label": "Heat Stress Risk", "value": "Low Risk/Moderate Risk/High Risk", "unit": "" },
                      "irrigation_need_score": { "label": "Irrigation Priority", "value": number_1_to_10, "unit": "/10" },
                      "air_quality_risk": { "label": "Air Quality Status", "value": "Excellent/Good/Fair/Poor" },
                      "sensor_reliability": { "label": "Data Reliability", "value": "High/Medium/Low", "unit": "" }
                    }
                  }

                  Sensor Data: ${safeData}
                  `
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const result = await response.json();

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini returned no JSON:", text);
      throw new Error("Gemini response did not contain valid JSON");
    }

    let json: any = {};
    try {
      json = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse extracted JSON:", jsonMatch[0]);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return json;
  } catch (err) {
    console.error("Gemini analysis failed", err);
    throw err;
  }
}
