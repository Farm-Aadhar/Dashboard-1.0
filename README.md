# Farm Insight Garden Dashboard

## Overview
Farm Insight Garden is a web-based dashboard designed to monitor, analyze, and control ESP-based sensor nodes deployed in agricultural environments. The platform provides real-time data visualization, device management, and AI-powered insights to help optimize farm operations.

---

## Project Structure

- **src/**: Main React app source code
  - **components/**: UI components (dashboard, layout, settings, etc.)
  - **api/**: API handlers for ESP data and database control
  - **contexts/**: React context providers (e.g., Auth)
  - **hooks/**: Custom React hooks
  - **integrations/**: Third-party integrations (e.g., Supabase)
  - **lib/**: Utility functions
  - **pages/**: App pages
  - **utils/**: Shared utilities
- **public/**: Static assets and API endpoints
  - **api/**: Serverless API scripts for ESP data/status
- **ESP Codes/**: Arduino sketches for ESP sensor nodes
- **supabase/**: Supabase configuration and migrations
- **scripts/**: Utility scripts (e.g., update ESP status)

---

## How Things Work

### 1. ESP Sensor Nodes
- ESP Data Collection Nodes collect comprehensive environmental data (e.g., soil moisture, air quality, temperature, humidity).
- Data is sent to the backend via HTTP endpoints or direct database integration.

### 2. Data Collection & Storage
- Data from ESP nodes is received by serverless API endpoints (`public/api/esp-data.js`, `public/api/esp-status.js`).
- Data is stored in a Supabase database for persistence and querying.
- **Weather API Integration**: External weather data from OpenWeatherMap validates sensor readings and improves reliability analysis.

### 3. Data Validation & Reliability
- **Weather Service**: Compares sensor data with external weather API to detect outliers and assess reliability.
- **Smart Validation**: Accounts for greenhouse effects while flagging unrealistic readings.
- **Reliability Scoring**: Provides confidence levels for sensor data accuracy.

### 3. Dashboard & Visualization
- The React dashboard (`src/components/dashboard/`) fetches and displays sensor data in real-time.
- Users can view device status, historical trends, and threshold alerts.
- **Weather Widget**: Shows external weather conditions alongside sensor validation results.

### 4. Settings & Control
- Thresholds for sensor alerts can be configured in the settings panel (`src/components/settings/ThresholdSettings.tsx`).
- Control commands can be sent to ESP nodes for remote management.

### 5. AI Analysis
- The GeminiAnalysis component provides AI-powered insights and recommendations based on collected data.
- **Enhanced with Weather Data**: AI analysis now includes external weather validation for more accurate assessments.
- **Crop-Specific Insights**: Provides recommendations tailored to the selected crop type.

### 6. Authentication
- User authentication is managed via Supabase (`src/contexts/AuthContext.tsx`).

---

## Development Flow

1. **Frontend**: Built with React, TypeScript, Tailwind CSS, and Vite.
2. **Backend/API**: Serverless functions in `public/api/` handle ESP data and status updates.
3. **Database**: Supabase is used for authentication and data storage.
4. **ESP Firmware**: Arduino sketches in `ESP Codes/` control sensor nodes.

---

## Getting Started

1. **Install dependencies**
   ```sh
   bun install
   ```
2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     - `VITE_GEMINI_API_KEY`: Get from Google AI Studio
     - `VITE_OPENWEATHER_API_KEY`: Get from OpenWeatherMap
     - Supabase credentials
3. **Start the development server**
   ```sh
   bun run dev
   ```
4. **Configure Supabase**
   - Update `supabase/config.toml` with your credentials.
5. **Deploy ESP Nodes**
   - Flash the sketches in `ESP Codes/` to your ESP devices.

---

## Key Files
- `src/App.tsx`: Main app entry point
- `src/components/dashboard/`: Dashboard UI
- `src/components/settings/ThresholdSettings.tsx`: Threshold settings
- `public/api/esp-data.js`: ESP data API
- `supabase/config.toml`: Supabase config
- `ESP Codes/`: ESP firmware

---

## Contributing
1. Fork the repo
2. Create a feature branch
3. Commit and push your changes
4. Open a pull request

---

## License
MIT License

---

## Contact
For questions or support, contact the Farm Aadhar team.
