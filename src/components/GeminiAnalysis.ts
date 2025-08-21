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
                  Analyze this farm sensor data and return JSON ONLY in the exact format below.Also Make sure the data u give in farm_health section Is more real and should be highly sensitive to the data you receive. The farm_health, score specifically Should be more precise to the data there should be no happening in there since it is an important KPI.
                  No explanations, no extra text.

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
                      "heat_stress_index": { "label": "string", "value": "string", "unit": "string" },
                      "irrigation_need_score": { "label": "string", "value": number, "unit": "string" },
                      "air_quality_risk": { "label": "string", "value": "string" },
                      "sensor_reliability": { "label": "string", "value": "string", "unit": "string" }
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
