import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Activity, 
  Maximize2, 
  Bell, 
  User, 
  LayoutDashboard, 
  History,
  AlertTriangle,
  CloudRain,
  CloudSun,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MetricCard } from './components/MetricCard';
import { RealTimeChart } from './components/RealTimeChart';
import { ControlPanel } from './components/ControlPanel';
import { SensorReading, ChartDataPoint, HVACState, Status, TelemetryResponse, RemoteControlPayload } from './types';
import { cn } from './lib/utils';

// Helper to determine status based on thresholds
const getStatus = (id: string, value: number): Status => {
  if (id === 'temp') {
    if (value > 26 || value < 18) return 'warning';
    return 'good';
  }
  if (id === 'humidity') {
    if (value > 60 || value < 30) return 'warning';
    return 'good';
  }
  if (id === 'co2') {
    if (value > 1000) return 'critical';
    if (value > 800) return 'warning';
    return 'good';
  }
  if (id === 'pm25') {
    if (value > 35) return 'critical';
    if (value > 12) return 'warning';
    return 'good';
  }
  return 'good';
};

interface HanoiWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  minTemp: number;
  maxTemp: number;
  precipitationProbability: number;
  weatherCode: number;
}

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Clear';
  if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Cloudy';
};

export default function App() {
  // --- STATE ---
  const [readings, setReadings] = useState<SensorReading[]>([
    { id: 'temp', name: 'Ambient Temp', value: 22.4, unit: '°C', status: 'good', trend: 1.2, icon: 'Thermometer' },
    { id: 'humidity', name: 'Relative Humidity', value: 45.1, unit: '%', status: 'good', trend: -0.5, icon: 'Droplets' },
    { id: 'co2', name: 'CO2 Levels', value: 420.0, unit: 'ppm', status: 'good', trend: 2.1, icon: 'Wind' },
    { id: 'pm25', name: 'Particulates (PM2.5)', value: 8.5, unit: 'µg/m³', status: 'good', trend: 0.8, icon: 'Activity' },
  ]);

  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [hvacState, setHvacState] = useState<HVACState>({
    power: true,
    mode: 'cool',
    targetTemp: 21.0,
    fanSpeed: 'medium',
  });
  const [hanoiWeather, setHanoiWeather] = useState<HanoiWeather | null>(null);
  const [isControlStateReady, setIsControlStateReady] = useState(false);

  const sendRemoteControl = useCallback(async (nextState: HVACState) => {
    const payload: RemoteControlPayload = {
      device_id: 'hvac-01',
      power: nextState.power,
      temp: nextState.targetTemp,
      operationMode: nextState.mode,
      fanPower: nextState.fanSpeed,
    };

    try {
      const response = await fetch('/api/remote-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Remote control request failed: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  // --- DATABASE TELEMETRY ---
  useEffect(() => {
    const updateReading = (reading: SensorReading, nextValue: number | null): SensorReading => {
      if (nextValue === null || Number.isNaN(nextValue)) {
        return reading;
      }

      return {
        ...reading,
        value: nextValue,
        status: getStatus(reading.id, nextValue),
        trend: reading.value === 0 ? 0 : ((nextValue - reading.value) / reading.value) * 100,
      };
    };

    const fetchTelemetry = async () => {
      try {
        const response = await fetch('/api/telemetry');
        if (!response.ok) {
          throw new Error(`Telemetry request failed: ${response.status}`);
        }

        const telemetry: TelemetryResponse = await response.json();
        setHistory(telemetry.history);
        setIsControlStateReady(prevReady => {
          if (!prevReady && telemetry.controlState) {
            setHvacState({
              power: telemetry.controlState.power,
              mode: telemetry.controlState.operationMode,
              targetTemp: telemetry.controlState.temp,
              fanSpeed: telemetry.controlState.fanPower,
            });
          }
          return true;
        });
        setReadings(prev => prev.map(reading => {
          if (reading.id === 'temp') return updateReading(reading, telemetry.latest.temperature);
          if (reading.id === 'humidity') return updateReading(reading, telemetry.latest.humidity);
          if (reading.id === 'co2') return updateReading(reading, telemetry.latest.co2);
          if (reading.id === 'pm25') return updateReading(reading, telemetry.latest.dust);
          return reading;
        }));
      } catch (error) {
        console.error(error);
      }
    };

    fetchTelemetry();
    const interval = window.setInterval(fetchTelemetry, 2000);

    return () => window.clearInterval(interval);
  }, []);

  // --- WEATHER ---
  useEffect(() => {
    const fetchHanoiWeather = async () => {
      try {
        const params = new URLSearchParams({
          latitude: '21.0245',
          longitude: '105.8412',
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          timezone: 'Asia/Bangkok',
          forecast_days: '1',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const weather = await response.json();
        setHanoiWeather({
          temperature: weather.current.temperature_2m,
          apparentTemperature: weather.current.apparent_temperature,
          humidity: weather.current.relative_humidity_2m,
          windSpeed: weather.current.wind_speed_10m,
          weatherCode: weather.current.weather_code,
          minTemp: weather.daily.temperature_2m_min[0],
          maxTemp: weather.daily.temperature_2m_max[0],
          precipitationProbability: weather.daily.precipitation_probability_max[0],
        });
      } catch (error) {
        console.error(error);
      }
    };

    fetchHanoiWeather();
    const interval = window.setInterval(fetchHanoiWeather, 2 * 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  // Derived stats
  const activeAlerts = useMemo(() => readings.filter(r => r.status !== 'good').length, [readings]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 overflow-x-clip selection:bg-blue-500/20">
      {/* --- TOP BAR --- */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase text-slate-900">HVAC Sentinel</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Streaming Live Telemetry</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-6 border-r border-slate-200 pr-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Uptime</span>
              <span className="text-xs font-mono text-slate-600">12d 04h 22m</span>
            </div>
          </div>

          <div className="relative">
            <Bell className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
            {activeAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
             <User className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dashboard Left Section: Metrics & Charts */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
                <p className="text-slate-400 text-sm">Zone: Main Server Hall A-42 • Floor 12</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 rounded text-xs font-semibold text-slate-600 transition-colors border border-slate-200">
                  <History className="w-3.5 h-3.5" />
                  Logs
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 rounded text-xs font-semibold text-slate-600 transition-colors border border-slate-200">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </button>
              </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard reading={readings[0]} icon={Thermometer} />
              <MetricCard reading={readings[1]} icon={Droplets} />
              <MetricCard reading={readings[2]} icon={Wind} />
              <MetricCard reading={readings[3]} icon={Activity} />
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 gap-6">
              <RealTimeChart data={history} />
            </div>

            {/* Secondary Intel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Maintenance Schedule</h4>
                  <div className="space-y-4">
                    {[
                      { item: 'HEPA Filter Replacement', status: 'Due in 4 days', color: 'text-amber-600' },
                      { item: 'Coolant Level Inspection', status: 'Optimal', color: 'text-emerald-600' },
                      { item: 'Sensor Calibration', status: 'Scheduled', color: 'text-blue-600' },
                    ].map((step, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <span className="text-xs text-slate-600 font-medium">{step.item}</span>
                         <span className={cn("text-[10px] font-bold uppercase", step.color)}>{step.status}</span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Energy Consumption</h4>
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-3xl font-bold font-mono text-slate-900">4.2<span className="text-sm text-slate-400 ml-1">kWh</span></p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">Current Load</p>
                     </div>
                     <div className="w-24 h-12 flex items-end gap-0.5">
                        {[4, 7, 5, 8, 3, 9, 6].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/10 rounded-t-sm" style={{ height: `${h * 10}%` }} />
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Dashbaord Right Section: Controls & Status */}
          <div className="lg:col-span-4 space-y-6">
            
            {isControlStateReady ? (
              <ControlPanel state={hvacState} setState={setHvacState} onControlChange={sendRemoteControl} />
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl h-full min-h-[560px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">AC Unit 01</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Loading State</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-8">
                  <div className="w-full aspect-square max-w-[200px] rounded-full border-8 border-slate-50 bg-slate-50 animate-pulse" />
                  <div className="w-full space-y-3">
                    <div className="h-3 w-32 mx-auto bg-slate-100 rounded animate-pulse" />
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-20 rounded-2xl bg-slate-50 border-2 border-slate-50 animate-pulse" />
                      ))}
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="h-12 rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Weather */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weather</h4>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium uppercase">
                    <MapPin className="w-3 h-3" />
                    Today
                  </div>
               </div>
                {hanoiWeather ? (
                  <div className="space-y-4">
                    {[
                      { item: 'Current Temperature', status: `${hanoiWeather.temperature.toFixed(1)}°C`, color: 'text-blue-600' },
                      { item: 'Condition', status: getWeatherLabel(hanoiWeather.weatherCode), color: 'text-sky-600' },
                      { item: 'Feels Like', status: `${hanoiWeather.apparentTemperature.toFixed(1)}°C`, color: 'text-slate-600' },
                    ].map((step) => (
                      <div key={step.item} className="flex justify-between items-center border-b border-slate-100 pb-2">
                         <span className="text-xs text-slate-600 font-medium">{step.item}</span>
                         <span className={cn("text-[10px] font-bold uppercase", step.color)}>{step.status}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {[
                        { label: 'Humidity', value: `${hanoiWeather.humidity}%`, icon: Droplets },
                        { label: 'Wind', value: `${hanoiWeather.windSpeed.toFixed(1)} km/h`, icon: Wind },
                        { label: 'High / Low', value: `${hanoiWeather.maxTemp.toFixed(1)} / ${hanoiWeather.minTemp.toFixed(1)}°C`, icon: Thermometer },
                        { label: 'Rain Chance', value: `${hanoiWeather.precipitationProbability}%`, icon: CloudRain },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                            <item.icon className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">{item.label}</span>
                          </div>
                          <p className="text-xs font-mono font-bold text-slate-700">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center">
                    <span className="text-xs text-slate-400 font-medium">Loading weather...</span>
                  </div>
                )}
            </div>

            {/* Notification Center */}
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">System Alerts</h4>
               <div className="space-y-4">
                  <AnimatePresence>
                    {activeAlerts > 0 ? (
                      readings.filter(r => r.status !== 'good').map((r) => (
                        <motion.div 
                          key={r.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={cn(
                            "p-3 rounded border flex items-start gap-3",
                            r.status === 'critical' ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
                          )}
                        >
                           <AlertTriangle className={cn("w-4 h-4 shrink-0", r.status === 'critical' ? "text-red-500" : "text-amber-500")} />
                           <div className="space-y-1">
                              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">High {r.name} Detected</p>
                              <p className="text-[10px] text-slate-500">Current value {r.value.toFixed(1)}{r.unit} exceeds threshold.</p>
                           </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">All systems nominal</p>
                      </div>
                    )}
                  </AnimatePresence>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
