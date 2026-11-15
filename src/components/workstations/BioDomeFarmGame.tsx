import React, { useEffect, useState } from 'react';
import { isLedSpectrumOptimal, NasaTechToolId } from '../../game/rules';
import { spaceAudio } from '../../game/audio';
import { ToolLockOverlay } from '../ToolLockOverlay';

const CROPS = [
  { name: 'Mizuna Lettuce', emoji: '🥬', desc: 'Fast-growing space salad' },
  { name: 'Dwarf Wheat', emoji: '🌾', desc: 'Crunchy astronaut bread grain' },
  { name: 'Astro Radish', emoji: '🌱', desc: 'NASA ISS crisp red sprout' },
] as const;

interface BioDomeFarmGameProps {
  isAlreadyDone: boolean;
  onComplete: (
    deltas: {
      food?: number;
      oxygen?: number;
      science?: number;
      pantryDelta?: {
        mizuna?: number;
        wheat?: number;
        radish?: number;
        berries?: number;
        microgreens?: number;
      };
    },
    logNote: string
  ) => void;
  unlockedTools?: NasaTechToolId[];
  equippedTool?: NasaTechToolId | '';
  onEquipTool?: (bay: 'eva' | 'lifesupport' | 'hydroponics', toolId: NasaTechToolId) => void;
  onOpenShop?: () => void;
  onOpenQuickQuiz?: () => void;
}

export const BioDomeFarmGame: React.FC<BioDomeFarmGameProps> = ({
  isAlreadyDone,
  onComplete,
  unlockedTools = [],
  equippedTool = '',
  onEquipTool,
  onOpenShop,
  onOpenQuickQuiz,
}) => {
  const [stage, setStage] = useState<'plant' | 'grow' | 'harvest' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'plant'
  );
  const [seedsPlanted, setSeedsPlanted] = useState<boolean[]>(
    isAlreadyDone ? [true, true, true] : [false, false, false]
  );
  const [ledSpectrum, setLedSpectrum] = useState<number>(76);
  const [moisture, setMoisture] = useState<number>(58);
  const [growthPct, setGrowthPct] = useState<number>(isAlreadyDone ? 100 : 0);
  const [lightStressSec, setLightStressSec] = useState<number>(0);
  const [podsHarvested, setPodsHarvested] = useState<boolean[]>(
    isAlreadyDone ? [true, true, true] : [false, false, false]
  );
  const [failReason, setFailReason] = useState<string>('');

  const hasParSensor = unlockedTools.includes('par_sensor');
  const isParEquipped = equippedTool === 'par_sensor';
  const [parAutoLockActive, setParAutoLockActive] = useState<boolean>(isParEquipped);

  useEffect(() => {
    if (isParEquipped) setParAutoLockActive(true);
  }, [isParEquipped]);

  const isOptimalLed = isLedSpectrumOptimal(ledSpectrum);
  const isOptimalMoisture = moisture >= 28 && moisture <= 85;
  const plantedCount = seedsPlanted.filter(Boolean).length;
  const harvestedCount = isAlreadyDone ? 3 : podsHarvested.filter(Boolean).length;

  const growParamsRef = React.useRef({ ledSpectrum, moisture });
  useEffect(() => {
    growParamsRef.current = { ledSpectrum, moisture };
  }, [ledSpectrum, moisture]);

  // If PAR sensor is auto-locked, keep spectrum at optimal 76%
  useEffect(() => {
    if (parAutoLockActive) {
      setLedSpectrum(76);
    }
  }, [parAutoLockActive]);

  // Real-time Hydroponic Growth & Evaporation Loop
  useEffect(() => {
    if (!hasParSensor || stage !== 'grow') return;
    const id = window.setInterval(() => {
      const { ledSpectrum: curLed, moisture: curMoisture } = growParamsRef.current;
      setMoisture((prev) => Math.max(0, Number((prev - 1.1).toFixed(1))));
      if (!isLedSpectrumOptimal(curLed)) {
        setLightStressSec((prev) => Number((prev + 0.15).toFixed(2)));
      } else {
        setLightStressSec(0);
      }
      if (isLedSpectrumOptimal(curLed) && curMoisture >= 28 && curMoisture <= 85) {
        setGrowthPct((prev) => Math.min(100, Number((prev + 3.2).toFixed(1))));
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [hasParSensor, stage]);

  // Evaluate fail/harvest thresholds outside state updaters
  useEffect(() => {
    if (!hasParSensor || stage !== 'grow') return;
    if (moisture <= 0) {
      setStage('failed');
      setFailReason(
        'Crop Wilted! Moisture evaporated to 0% before harvest. Keep tapping Mist Water!'
      );
      spaceAudio.playBreakerClick(false);
    } else if (moisture >= 100) {
      setStage('failed');
      setFailReason('Root Rot Flood! Over-watering hit 100% and drowned the roots.');
      spaceAudio.playBreakerClick(false);
    } else if (lightStressSec >= 3.2) {
      setStage('failed');
      setFailReason(
        'LED Spectrum Stress! Holding Red/Blue wavelength outside 65%–88% scorched the leaves.'
      );
      spaceAudio.playBreakerClick(false);
    } else if (growthPct >= 100) {
      setStage('harvest');
      spaceAudio.playBreakerClick(true);
    }
  }, [hasParSensor, stage, moisture, lightStressSec, growthPct]);

  const handlePlantSeed = (idx: number) => {
    if (!hasParSensor || stage !== 'plant' || seedsPlanted[idx]) return;
    const next = [...seedsPlanted];
    next[idx] = true;
    setSeedsPlanted(next);
    spaceAudio.playBreakerClick(true);
    if (next.every(Boolean)) {
      setStage('grow');
      setGrowthPct(5);
      setMoisture(58);
      setLightStressSec(0);
    }
  };

  const handleMistWater = () => {
    if (!hasParSensor || stage !== 'grow') return;
    spaceAudio.playBreakerClick(true);
    setMoisture((prev) => Math.min(100, Math.round(prev + 18)));
  };

  const handleHarvestPod = (idx: number) => {
    if (!hasParSensor || stage !== 'harvest' || podsHarvested[idx] || isAlreadyDone) return;
    const next = [...podsHarvested];
    next[idx] = true;
    setPodsHarvested(next);
    spaceAudio.playBreakerClick(true);
    if (next.every(Boolean)) {
      setStage('completed');
      onComplete(
        {
          food: 9,
          oxygen: 4,
          science: 20,
          pantryDelta: { mizuna: 2, wheat: 2, radish: 2, berries: 1, microgreens: 1 },
        },
        'Planted, Hydrated, and Harvested NASA OSDR-379 Crops (+9% Food, +4% O2, +Fresh Kitchen Pantry Crops)'
      );
    }
  };

  const resetBioDome = () => {
    if (!hasParSensor) return;
    setSeedsPlanted([false, false, false]);
    setPodsHarvested([false, false, false]);
    setLedSpectrum(76);
    setMoisture(58);
    setGrowthPct(0);
    setLightStressSec(0);
    setFailReason('');
    setStage('plant');
    spaceAudio.playBreakerClick(true);
  };

  const handleToggleParAutoLock = () => {
    if (!hasParSensor) return;
    spaceAudio.playBreakerClick(true);
    setParAutoLockActive((prev) => {
      const next = !prev;
      if (next) {
        setLedSpectrum(76);
        if (!isParEquipped) onEquipTool?.('hydroponics', 'par_sensor');
      }
      return next;
    });
  };

  return (
    <div className="relative">
      <div
        className={`space-y-2 ${hasParSensor ? '' : 'pointer-events-none select-none opacity-40'}`}
        aria-hidden={!hasParSensor}
        inert={!hasParSensor}
      >
      {/* Tool Selection Bar from Backpack */}
      <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-300">
            🎒 BIO-DOME TOOL
          </span>
          {hasParSensor ? (
            <button
              type="button"
              onClick={handleToggleParAutoLock}
              className={`min-h-11 px-3 py-2 rounded-xl text-base font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                parAutoLockActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-800 text-emerald-300 hover:text-white'
              }`}
            >
              <span>🌱</span>
              <span>
                {parAutoLockActive
                  ? '✓ PAR Quantum Sensor Active (Locked at 76%)'
                  : 'Activate PAR Quantum Sensor'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenShop}
              className="min-h-11 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 text-base font-bold cursor-pointer flex items-center gap-1"
            >
              <span>🔒</span>
              <span>Buy PAR Sensor in Shop</span>
            </button>
          )}
        </div>

        <div className="text-base font-mono">
          {parAutoLockActive ? (
            <span className="text-emerald-300 font-bold">🎯 65%–88% RED/BLUE SPECTRUM AUTO-LOCKED</span>
          ) : (
            <span className="text-slate-400">Manual Slider Calibration</span>
          )}
        </div>
      </div>

      {/* Main Bio-Dome Stage Card */}
      <div className="p-3 rounded-2xl bg-[#090E1A] border-2 border-emerald-500/40 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Dynamic Growth Chamber SVG Graphic */}
        <div className="relative rounded-2xl bg-[#050C16] border border-slate-800 p-3 flex flex-col items-center justify-center min-h-[150px]">
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-colors duration-300"
            style={{
              backgroundColor: isOptimalLed
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.18)',
            }}
          />

          {/* PAR Sensor Scanner Cross-Rays */}
          {parAutoLockActive && (
            <div             className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-950 border border-emerald-400 text-base font-mono text-emerald-200">
              PAR: 76% OPTIMAL
            </div>
          )}

          <svg viewBox="0 0 160 130" className="w-36 h-32 drop-shadow-md" role="img" aria-label="Hydroponic Growth Tray">
            <ellipse cx="80" cy="112" rx="60" ry="14" fill="#1E293B" stroke="#334155" strokeWidth="2" />
            <ellipse cx="80" cy="108" rx="52" ry="10" fill="#064E3B" />

            {/* 3 Sprouts growing according to growthPct */}
            {[38, 80, 122].map((x, i) => {
              const stemH = Math.max(6, (growthPct / 100) * 44);
              const leafScale = Math.max(0.2, growthPct / 100);
              return (
                <g key={i} transform={`translate(${x}, 108)`}>
                  <path
                    d={`M0 0 Q${(i - 1) * 4} ${-stemH / 2} 0 ${-stemH}`}
                    stroke={stage === 'failed' ? '#B45309' : '#34D399'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <ellipse
                    cx={-9 * leafScale}
                    cy={-stemH * 0.75}
                    rx={10 * leafScale}
                    ry={6 * leafScale}
                    fill={stage === 'failed' ? '#D97706' : '#10B981'}
                  />
                  <ellipse
                    cx={9 * leafScale}
                    cy={-stemH * 0.8}
                    rx={10 * leafScale}
                    ry={6 * leafScale}
                    fill={stage === 'failed' ? '#D97706' : '#34D399'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="text-xl font-bold text-emerald-300">
            🌱 NASA OSDR Space Farm
          </div>
          <p className="text-base text-slate-200">
            {stage === 'plant' &&
              `🌱 Plant 3 trays (${plantedCount}/3).`}
            {stage === 'grow' &&
              '💧 Balance light + water to grow!'}
            {stage === 'harvest' &&
              '✂️ Crops are ready! Tap all 3 pods.'}
            {stage === 'completed' &&
              '✅ Harvest complete! +Food · +O₂ · +Science'}
            {stage === 'failed' && failReason}
          </p>
          <div className="px-3 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-base text-emerald-200">
            💡 Red/blue LEDs + water help crops grow!
          </div>

          {/* LED Slider with PAR Sensor Highlights */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="led-spectrum-slider" className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Grow LED Tuner ({ledSpectrum}% Red / {100 - ledSpectrum}% Blue)</span>
                {parAutoLockActive && (
                  <span className="text-base font-mono px-1.5 py-0.5 rounded bg-emerald-900 border border-emerald-500 text-emerald-200">
                    🔒 PAR LOCK
                  </span>
                )}
              </label>
              <span
                className={`text-base font-mono font-bold ${
                  isOptimalLed ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isOptimalLed
                  ? '★ OPTIMAL 65%–88%'
                  : `STRESS! (${Math.max(0, 3.2 - lightStressSec).toFixed(1)}s)`}
              </span>
            </div>
            <input
              id="led-spectrum-slider"
              type="range"
              min={40}
              max={100}
              value={ledSpectrum}
              disabled={parAutoLockActive}
              onChange={(e) => setLedSpectrum(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer disabled:opacity-80"
            />
          </div>

          {/* Hydration + Growth Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-base font-mono mb-1">
                <span className="text-sky-300">HYDRATION (SAFE 28–85%)</span>
                <span
                  className={`font-bold tabular-nums ${
                    isOptimalMoisture ? 'text-sky-300' : 'text-rose-400'
                  }`}
                >
                  {Math.round(moisture)}%
                </span>
              </div>
              <div className="relative w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    isOptimalMoisture ? 'bg-sky-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, moisture)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-base font-mono mb-1">
                <span className="text-emerald-300">CROP BLOOM</span>
                <span className="font-bold text-emerald-300 tabular-nums">
                  {Math.round(growthPct)}%
                </span>
              </div>
              <div className="relative w-full h-3.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150"
                  style={{ width: `${growthPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Crop Trays & Action Buttons */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-base font-bold text-slate-200">
            🌱 3 CROP TRAYS
          </div>
          {stage === 'grow' && (
            <button
              type="button"
              onClick={handleMistWater}
              className="min-h-11 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-base shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>💧</span>
              <span>Mist Water (+18% Moisture)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CROPS.map((crop, idx) => {
            const isPlanted = seedsPlanted[idx];
            const isHarvested = isAlreadyDone ? true : podsHarvested[idx];

            return (
              <div
                key={crop.name}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{crop.emoji}</span>
                  <div>
                    <div className="text-xl font-bold text-white">{crop.name}</div>
                    <div className="text-base text-slate-300">{crop.desc}</div>
                  </div>
                </div>

                <div>
                  {stage === 'plant' && (
                    <button
                      type="button"
                      disabled={isPlanted}
                      onClick={() => handlePlantSeed(idx)}
                      className={`w-full min-h-11 py-2 rounded-lg text-base font-bold cursor-pointer transition-all ${
                        isPlanted
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      {isPlanted ? '✓ Planted' : '🌱 Plant Seed'}
                    </button>
                  )}

                  {stage === 'grow' && (
                    <div className="text-center py-1.5 rounded-lg bg-slate-900 text-base font-mono text-emerald-200">
                      🌱 Growing!
                    </div>
                  )}

                  {stage === 'harvest' && (
                    <button
                      type="button"
                      disabled={isHarvested}
                      onClick={() => handleHarvestPod(idx)}
                      className={`w-full min-h-11 py-2 rounded-lg text-base font-bold cursor-pointer transition-all ${
                        isHarvested
                          ? 'bg-slate-800 text-emerald-400'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 animate-pulse'
                      }`}
                    >
                      {isHarvested ? '✓ Harvested' : '✂️ Harvest Crop Pod'}
                    </button>
                  )}

                  {stage === 'completed' && (
                    <div className="text-center py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-base font-mono text-emerald-200">
                      ✓ Fresh Rations Harvested
                    </div>
                  )}

                  {stage === 'failed' && (
                    <div className="text-center py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-base font-mono text-rose-200">
                      Crop Wilted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {stage === 'failed' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={resetBioDome}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base cursor-pointer shadow-lg"
            >
              Reset Soil Beds &amp; Replant
            </button>
          </div>
        )}
      </div>
      </div>
      {!hasParSensor && (
        <ToolLockOverlay
          requiredTool="PAR Quantum Sensor"
          onOpenQuickQuiz={onOpenQuickQuiz}
          onOpenShop={onOpenShop}
        />
      )}
    </div>
  );
};
