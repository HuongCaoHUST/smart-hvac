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
  temp: number;
  humidity: number;
  co2: number;
  pm25: number;
}

export interface HVACState {
  power: boolean;
  mode: 'cool' | 'heat' | 'fan';
  targetTemp: number;
  fanSpeed: 'low' | 'medium' | 'high' | 'auto';
}
