// Data model for ideal conditions of polyhouse crops
export interface CropCondition {
  cropName: string;
  idealAirTemperature: { min: number; max: number; unit: string };
  idealAirHumidity: { min: number; max: number; unit: string };
  idealSoilTemperature: { min: number; max: number; unit: string };
  idealSoilMoisture: { min: number; max: number; unit: string };
  idealSoilHumidity: { min: number; max: number; unit: string };
  notes?: string;
}

export const POLYHOUSE_CROP_CONDITIONS: CropCondition[] = [
  {
    cropName: "Tomato",
    idealAirTemperature: { min: 18, max: 28, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 18, max: 25, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Prefers well-drained soil, avoid waterlogging."
  },
  {
    cropName: "Cucumber",
    idealAirTemperature: { min: 20, max: 30, unit: "°C" },
    idealAirHumidity: { min: 70, max: 90, unit: "%" },
    idealSoilTemperature: { min: 20, max: 25, unit: "°C" },
    idealSoilMoisture: { min: 70, max: 85, unit: "%" },
    idealSoilHumidity: { min: 70, max: 85, unit: "%" },
    notes: "Sensitive to low temperatures."
  },
  {
    cropName: "Capsicum (Bell Pepper)",
    idealAirTemperature: { min: 18, max: 25, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 18, max: 22, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Requires moderate humidity and temperature."
  },
  {
    cropName: "Lettuce",
    idealAirTemperature: { min: 15, max: 22, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 15, max: 20, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Prefers cooler conditions."
  },
  {
    cropName: "Strawberry",
    idealAirTemperature: { min: 18, max: 24, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 18, max: 22, unit: "°C" },
    idealSoilMoisture: { min: 70, max: 85, unit: "%" },
    idealSoilHumidity: { min: 70, max: 85, unit: "%" },
    notes: "Needs high humidity and moisture."
  },
  {
    cropName: "Gerbera",
    idealAirTemperature: { min: 18, max: 24, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 18, max: 22, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Popular flower crop."
  },
  {
    cropName: "Rose",
    idealAirTemperature: { min: 15, max: 28, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 15, max: 22, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Requires good air circulation."
  },
  {
    cropName: "Carnation",
    idealAirTemperature: { min: 15, max: 25, unit: "°C" },
    idealAirHumidity: { min: 60, max: 80, unit: "%" },
    idealSoilTemperature: { min: 15, max: 20, unit: "°C" },
    idealSoilMoisture: { min: 60, max: 80, unit: "%" },
    idealSoilHumidity: { min: 60, max: 80, unit: "%" },
    notes: "Sensitive to high humidity."
  }
];
