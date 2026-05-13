export type Status = 'good' | 'warning' | 'critical' | 'active';

export interface SensorReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: Status;
  trend: number; // percentage change
  icon: string;
}

export interface ChartDataPoint {
  time: string;
  temp: number | null;
  outdoorTemp: number | null;
  co2: number | null;
  pm25: number | null;
}

export interface TelemetryResponse {
  latest: {
    temperature: number | null;
    outdoor_temperature: number | null;
    humidity: number | null;
    co2: number | null;
    dust: number | null;
    time: string | null;
  };
  history: ChartDataPoint[];
}

export interface HVACState {
  power: boolean;
  mode: 'cool' | 'heat' | 'fan';
  targetTemp: number;
  fanSpeed: 'low' | 'medium' | 'high' | 'auto';
}
