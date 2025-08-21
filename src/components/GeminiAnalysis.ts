const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function getAnalysis(farmData: any[]) {
  try {
    const safeData = JSON.stringify(farmData.slice(-10)); // last 10 readings only

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
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
                  
                  IMPORTANT REFERENCE VALUES FOR NORMAL POLYHOUSE CONDITIONS:
                  - Air Temperature: 15-40°C (base: 25°C, normal range: ±3°C)
                  - Air Humidity: 30-90% (base: 65%, normal range: ±8%)
                  - Air Quality (MQ135): 70-150 ppm (base: 100 ppm, normal range: ±20 ppm, lower = better)
                  - Alcohol (MQ3): 100-500 ppm (base: 150 ppm, normal range: ±40 ppm)
                  - Smoke (MQ2): 200-400 ppm (base: 250 ppm, normal range: ±80 ppm)
                  - Soil Temperature: 15-35°C (base: 22°C, normal range: ±2°C)
                  - Soil Humidity: 40-90% (base: 70%, normal range: ±10%)
                  - Soil Moisture: 20-90% (base: 60%, normal range: ±15%)

                  FORMAT REQUIREMENTS:
                  - For indices, use descriptive labels like "Heat Stress Risk" instead of just "Heat Stress"
                  - Include risk levels (Low Risk, Moderate Risk, High Risk) or status (Good, Fair, Poor)
                  - Make values intuitive (higher numbers = better for positive metrics, lower = better for risk metrics)
                  
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
