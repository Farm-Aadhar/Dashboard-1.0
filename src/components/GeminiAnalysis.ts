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
                  - Air Temperature: 18-35°C (optimal: 25-30°C, warning: <20°C or >32°C, critical: <18°C or >35°C)
                  - Air Humidity: 30-85% (optimal: 40-80%, warning: <40% or >80%, critical: <30% or >85%)
                  - Air Quality (MQ135): 1000-3500 ppm (optimal: <3000 ppm, warning: 3000-3500 ppm, critical: >3500 ppm)
                  - Alcohol (MQ3): 500-1500 ppm (optimal: <1200 ppm, warning: 1200-1500 ppm, critical: >1500 ppm)
                  - Smoke (MQ2): 1000-2500 ppm (optimal: <2200 ppm, warning: 2200-2500 ppm, critical: >2500 ppm)
                  - Soil Temperature: 18-35°C (optimal: 20-32°C, warning: <20°C or >32°C, critical: <18°C or >35°C)
                  - Soil Humidity: 30-85% (optimal: 40-80%, warning: <40% or >80%, critical: <30% or >85%)
                  - Soil Moisture: 15-85% (optimal: 25-75%, warning: <25% or >75%, critical: <15% or >85%)

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
