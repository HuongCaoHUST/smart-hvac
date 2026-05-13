import React from 'react';
import { Power, Wind, Sun, Snowflake, Plus, Minus, Fan, Thermometer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HVACState } from '../types';
import { cn } from '../lib/utils';

interface ControlPanelProps {
  state: HVACState;
  setState: React.Dispatch<React.SetStateAction<HVACState>>;
  onControlChange: (state: HVACState) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, setState, onControlChange }) => {
  const updateControl = (getNextState: (state: HVACState) => HVACState) => {
    const next = getNextState(state);
    setState(next);
    onControlChange(next);
  };

  const togglePower = () => updateControl(prev => ({ ...prev, power: !prev.power }));
  
  const setMode = (mode: HVACState['mode']) => updateControl(prev => ({ ...prev, mode }));
  
  const adjustTemp = (delta: number) => 
    updateControl(prev => ({ ...prev, targetTemp: Math.round((Math.min(30, Math.max(16, prev.targetTemp + delta))) * 2) / 2 }));

  const setFanSpeed = (fanSpeed: HVACState['fanSpeed']) => updateControl(prev => ({ ...prev, fanSpeed }));

  const modeColors: Record<string, string> = {
    cool: 'text-blue-500 bg-blue-50 border-blue-200',
    heat: 'text-orange-500 bg-orange-50 border-orange-200',
    fan: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  };

  const modeGlows: Record<string, string> = {
    cool: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    heat: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    fan: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">AC Unit 01</h3>
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", state.power ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
            <span className="text-[10px] font-bold text-slate-500 uppercase">{state.power ? 'System Ready' : 'Standby'}</span>
          </div>
        </div>
        <button
          onClick={togglePower}
          className={cn(
            "p-3 rounded-full transition-all duration-500 ring-4",
            state.power 
              ? "bg-emerald-500 ring-emerald-100 text-white shadow-lg" 
              : "bg-slate-100 ring-slate-50 text-slate-300"
          )}
        >
          <Power className="w-5 h-5" />
        </button>
      </div>

      <div className={cn("flex-1 space-y-8 transition-all duration-700", !state.power && "opacity-20 grayscale pointer-events-none")}>
        
        {/* Visual Temperature Controller */}
        <div className="relative flex flex-col items-center">
          <div className={cn(
            "w-full aspect-square max-w-[200px] rounded-full border-8 border-slate-50 bg-white flex flex-col items-center justify-center transition-all duration-500",
            state.power && modeGlows[state.mode]
          )}>
            <div className="text-slate-400 mb-1 flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Target</span>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={state.targetTemp}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-6xl font-bold font-mono text-slate-900 tabular-nums leading-none"
              >
                {state.targetTemp.toFixed(1)}
              </motion.div>
            </AnimatePresence>
            
            <span className="text-xl font-bold text-slate-400 mt-1">°C</span>
          </div>

          {/* Floating Buttons */}
          <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2">
            <button 
              onClick={() => adjustTemp(-0.5)}
              className="p-4 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-blue-500 transition-all active:scale-90 pointer-events-auto"
            >
              <Minus className="w-6 h-6" />
            </button>
            <button 
              onClick={() => adjustTemp(0.5)}
              className="p-4 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-red-500 transition-all active:scale-90 pointer-events-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mode Grid */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">Operation Mode</span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'cool', icon: Snowflake, label: 'Cooling' },
              { id: 'heat', icon: Sun, label: 'Heating' },
              { id: 'fan', icon: Wind, label: 'Breeze' },
            ].map((m) => {
              const isActive = state.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as HVACState['mode'])}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group",
                    isActive 
                      ? modeColors[m.id] 
                      : "bg-white border-slate-50 text-slate-400 hover:border-slate-200"
                  )}
                >
                  <m.icon className={cn("w-5 h-5", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                  <span className="text-[9px] uppercase font-black tracking-tight">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fan Speed - Visual Slider feel */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fan Power</span>
             <Fan className={cn("w-3 h-3 text-slate-300", state.power && "animate-spin")} style={{ animationDuration: state.fanSpeed === 'high' ? '1s' : state.fanSpeed === 'medium' ? '2s' : '4s' }} />
          </div>
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
            {['low', 'medium', 'high', 'auto'].map((speed) => (
              <button
                key={speed}
                onClick={() => setFanSpeed(speed as HVACState['fanSpeed'])}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-bold uppercase transition-all",
                  state.fanSpeed === speed 
                    ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
