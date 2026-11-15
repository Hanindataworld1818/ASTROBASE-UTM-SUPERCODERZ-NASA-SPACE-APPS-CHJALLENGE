import React, { useEffect, useState } from 'react';
import {
  GameStateSnapshot,
  PowerAllocation,
  calculateSolOutcome,
  getTotalAllocatedPower,
  isPhaseInGreenZone,
} from '../../game/rules';
import { spaceAudio } from '../../game/audio';

const WIRE_LEFT = [
  { id: 'amber', label: 'Solar Bus', color: '#F59E0B' },
  { id: 'cyan', label: 'ECLSS Air', color: '#38BDF8' },
  { id: 'violet', label: 'Shield Coil', color: '#A855F7' },
] as const;

const WIRE_RIGHT = [
  { id: 'violet', label: 'Vault Ring', color: '#A855F7', row: 0 },
  { id: 'amber', label: 'Core Grid', color: '#F59E0B', row: 1 },
  { id: 'cyan', label: 'O2 Pump', color: '#38BDF8', row: 2 },
] as const;

interface PowerGridGameProps {
  gameState: GameStateSnapshot;
  isAlreadyDone: boolean;
  onUpdatePower: (newAlloc: PowerAllocation) => void;
  onComplete: (
    deltas: { science?: number; bonusPowerKw?: number },
    logNote: string
  ) => void;
}

export const PowerGridGame: React.FC<PowerGridGameProps> = ({
  gameState,
  isAlreadyDone,
  onUpdatePower,
  onComplete,
}) => {
  const projection = calculateSolOutcome(gameState);
  const totalUsedKw = getTotalAllocatedPower(gameState.powerAllocation);
  const spareKw = gameState.availablePowerKw - totalUsedKw;

  const [selectedLeftWire, setSelectedLeftWire] = useState<string | null>(null);
  const [matchedWires, setMatchedWires] = useState<Record<string, boolean>>({
    amber: false,
    cyan: false,
    violet: false,
  });
  const [wireErrors, setWireErrors] = useState<number>(0);
  const [syncErrors, setSyncErrors] = useState<number>(0);
  const [phasePct, setPhasePct] = useState<number>(30);
  const [phaseSynced, setPhaseSynced] = useState<boolean>(false);
  const [taskPhase, setTaskPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [failReason, setFailReason] = useState<string>('');
  const [wireHint, setWireHint] = useState<string>(
    '🔌 Match the wires!'
  );

  const allWiresMatched = isAlreadyDone || Object.values(matchedWires).every(Boolean);

  // Smooth oscillating turbine phase gauge once wires are connected
  useEffect(() => {
    if (taskPhase !== 'playing' || !allWiresMatched || phaseSynced) return;
    let frameId = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const wave = 50 + 48 * Math.sin(elapsed * 2.5);
      setPhasePct(Math.round(wave));
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [taskPhase, allWiresMatched, phaseSynced]);

  const adjustPower = (key: keyof PowerAllocation, delta: number) => {
    const cur = gameState.powerAllocation[key];
    const nextVal = cur + delta;
    if (nextVal < 0 || nextVal > 3) return;
    if (delta > 0 && spareKw <= 0) return;
    spaceAudio.playBreakerClick(delta > 0);
    onUpdatePower({
      ...gameState.powerAllocation,
      [key]: nextVal,
    });
  };

  const resetTask = () => {
    setSelectedLeftWire(null);
    setMatchedWires({ amber: false, cyan: false, violet: false });
    setWireErrors(0);
    setSyncErrors(0);
    setPhasePct(30);
    setPhaseSynced(false);
    setFailReason('');
    setTaskPhase('playing');
    setWireHint('🔌 Match the wires!');
    spaceAudio.playBreakerClick(true);
  };

  const handleRightSocketClick = (socketColorId: string) => {
    if (taskPhase !== 'playing' || isAlreadyDone || matchedWires[socketColorId]) return;
    if (!selectedLeftWire) {
      setWireHint('👈 Pick a wire first!');
      spaceAudio.playBreakerClick(false);
      return;
    }
    if (selectedLeftWire === socketColorId) {
      const next = { ...matchedWires, [socketColorId]: true };
      setMatchedWires(next);
      setSelectedLeftWire(null);
      spaceAudio.playBreakerClick(true);
      if (Object.values(next).every(Boolean)) {
        setWireHint('✅ Wires linked! Sync in green!');
      } else {
        setWireHint('✨ Nice match! Keep going!');
      }
    } else {
      spaceAudio.playBreakerClick(false);
      const nextErr = wireErrors + 1;
      setWireErrors(nextErr);
      setSelectedLeftWire(null);
      if (nextErr >= 3) {
        setTaskPhase('failed');
        setFailReason('Breaker tripped! Reset and try again.');
      } else {
        setWireHint(`⚠️ Short circuit ${nextErr}/3! Match colors.`);
      }
    }
  };

  const handleSyncTurbine = () => {
    if (taskPhase !== 'playing' || !allWiresMatched || phaseSynced || isAlreadyDone) return;
    if (isPhaseInGreenZone(phasePct)) {
      setPhaseSynced(true);
      setTaskPhase('completed');
      spaceAudio.playBreakerClick(true);
      setWireHint('⚡ Turbine synced! +1 kW power!');
      onComplete(
        { bonusPowerKw: 1, science: 20 },
        'Synchronized Reactor Conduits & Turbine Phase (+1 kW Bonus Power)'
      );
    } else {
      spaceAudio.playBreakerClick(false);
      const nextSyncErr = syncErrors + 1;
      setSyncErrors(nextSyncErr);
      if (nextSyncErr >= 3) {
        setTaskPhase('failed');
        setFailReason('Turbine overload! Reset and try again.');
      } else {
        setWireHint(`⏱️ Miss ${nextSyncErr}/3! Tap in green.`);
      }
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-[#090E1A] p-2">
        <h3 className="text-xl font-extrabold text-white">⚡ Reactor &amp; Solar Grid</h3>
        <div className="rounded-xl border border-amber-400/50 bg-amber-950/60 px-4 py-2 text-base font-extrabold text-amber-300">
          ⚡ SPARE POWER: {spareKw} kW
        </div>
      </div>

      {/* 4 Tactile Breaker Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(
          [
            {
              key: 'lifesupport',
              label: 'O₂ Bay',
              effect: '+10% O₂ / kW',
              color: 'text-sky-400',
              barColor: 'bg-sky-400',
            },
            {
              key: 'shield',
              label: 'Shields',
              effect: 'Block solar flares',
              color: 'text-purple-400',
              barColor: 'bg-purple-400',
            },
            {
              key: 'hydroponics',
              label: 'Bio-Dome',
              effect: 'Grow food + O₂',
              color: 'text-emerald-400',
              barColor: 'bg-emerald-400',
            },
            {
              key: 'comms',
              label: 'Comms',
              effect: 'Earn science points',
              color: 'text-pink-400',
              barColor: 'bg-pink-400',
            },
          ] as const
        ).map((item) => {
          const val = gameState.powerAllocation[item.key];
          return (
            <div
              key={item.key}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-2"
            >
              <div>
                <div className={`font-bold text-lg ${item.color}`}>{item.label}</div>
                <div className="text-base text-slate-300 mt-0.5">{item.effect}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 1, 2].map((pip) => (
                    <span
                      key={pip}
                      className={`w-9 h-4 rounded-md transition-colors ${
                        pip < val ? item.barColor : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  aria-label={`Decrease ${item.label} power`}
                  onClick={() => adjustPower(item.key, -1)}
                  disabled={val <= 0}
                  className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-2xl cursor-pointer"
                >
                  -
                </button>
                <span className="w-12 text-center text-xl font-bold tabular-nums">{val}kW</span>
                <button
                  type="button"
                  aria-label={`Increase ${item.label} power`}
                  onClick={() => adjustPower(item.key, 1)}
                  disabled={val >= 3 || spareKw <= 0}
                  className="w-12 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-2xl cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overnight Projection Preview */}
      <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800 grid grid-cols-3 gap-2 text-center font-mono">
        <div>
          <div className="text-base font-semibold text-slate-300">NEXT SOL OXYGEN</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.oxygenDelta >= 0 ? 'text-sky-400' : 'text-amber-400'
            }`}
          >
            {projection.nextOxygen}% ({projection.oxygenDelta >= 0 ? '+' : ''}
            {projection.oxygenDelta}%)
          </div>
        </div>
        <div>
          <div className="text-base font-semibold text-slate-300">NEXT SOL FOOD</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.foodDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {projection.nextFood}% ({projection.foodDelta >= 0 ? '+' : ''}
            {projection.foodDelta}%)
          </div>
        </div>
        <div>
          <div className="text-base font-semibold text-slate-300">RADIATION DOSE</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              projection.radiationDeltaMsv <= 5 ? 'text-purple-400' : 'text-rose-400'
            }`}
          >
            +{projection.radiationDeltaMsv} mSv ({projection.shieldEfficiencyPct}% Blocked)
          </div>
        </div>
      </div>

      {/* 2-Stage Reactor Wire & Turbine Sync Mini-Game */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xl font-bold text-white">
              🔌 Wire Match &amp; Turbine Sync
            </div>
            <div className="text-base font-semibold text-amber-300 mt-0.5">{wireHint}</div>
          </div>
          <div className="text-base font-mono text-slate-200 tabular-nums">
            ⚠️ {wireErrors}/3 · ⏱️ {syncErrors}/3
          </div>
        </div>

        {taskPhase === 'failed' ? (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/70 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-rose-300">REACTOR BREAKER TRIPPED!</div>
              <div className="text-base text-rose-100 mt-0.5">{failReason}</div>
            </div>
            <button
              type="button"
              onClick={resetTask}
              className="min-h-12 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base cursor-pointer"
            >
              Restart Reactor Task
            </button>
          </div>
        ) : (
          <>
            <div className="relative grid grid-cols-3 gap-1.5 items-center bg-[#090E1A] p-2 rounded-xl border border-slate-800">
              {/* Left Wire Terminals */}
              <div className="space-y-2 z-10">
                {WIRE_LEFT.map((w) => {
                  const connected = isAlreadyDone || matchedWires[w.id];
                  const selected = selectedLeftWire === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={connected}
                      onClick={() => {
                        setSelectedLeftWire(w.id);
                        setWireHint(`➡️ Match ${w.label}!`);
                        spaceAudio.playBreakerClick(true);
                      }}
                      className={`w-full min-h-11 py-2 px-2 rounded-xl border-2 text-left text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                        connected
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : selected
                          ? 'bg-slate-800 border-white scale-105 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span>{w.label}</span>
                      <span
                        className="w-5 h-5 rounded-full border border-slate-950"
                        style={{ backgroundColor: w.color }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Center Glowing SVG Bezier Wires */}
              <svg viewBox="0 0 200 156" className="w-full h-32" aria-hidden="true">
                {[26, 78, 130].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="200"
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                ))}
                {(isAlreadyDone || matchedWires.amber) && (
                  <path
                    d="M 4 26 C 95 26, 105 78, 196 78"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
                {(isAlreadyDone || matchedWires.cyan) && (
                  <path
                    d="M 4 78 C 95 78, 105 130, 196 130"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
                {(isAlreadyDone || matchedWires.violet) && (
                  <path
                    d="M 4 130 C 95 130, 105 26, 196 26"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                )}
              </svg>

              {/* Right Color Sockets */}
              <div className="space-y-2 z-10">
                {WIRE_RIGHT.map((s) => {
                  const connected = isAlreadyDone || matchedWires[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={connected}
                      onClick={() => handleRightSocketClick(s.id)}
                      className={`w-full min-h-11 py-2 px-2 rounded-xl border-2 text-right text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                        connected
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-slate-950"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{connected ? `⚡ ${s.label}` : s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Live Oscillating Turbine Phase-Sync Meter */}
            <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[220px] space-y-1.5">
                <div className="flex items-center justify-between text-base font-mono">
                  <span className="text-slate-300">
                    STEP 2 · TURBINE PHASE SYNC ({allWiresMatched ? 'ACTIVE' : 'CONNECT WIRES FIRST'})
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      phaseSynced || isAlreadyDone
                        ? 'text-emerald-400'
                        : isPhaseInGreenZone(phasePct)
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {phaseSynced || isAlreadyDone ? 'LOCKED 100%' : `${phasePct}%`}
                  </span>
                </div>
                <div className="relative w-full h-5 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                  {/* Green Target Sweet Spot 68% - 96% */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/35 border-x border-emerald-400"
                    style={{ left: '68%', width: '28%' }}
                  />
                  {/* Moving Needle */}
                  <div
                    className={`absolute top-0 bottom-0 w-2 rounded-full ${
                      phaseSynced || isAlreadyDone
                        ? 'bg-emerald-400'
                        : isPhaseInGreenZone(phasePct)
                        ? 'bg-emerald-300'
                        : 'bg-amber-400'
                    }`}
                    style={{ left: `calc(${phaseSynced || isAlreadyDone ? 82 : phasePct}% - 4px)` }}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!allWiresMatched || phaseSynced || isAlreadyDone}
                onClick={handleSyncTurbine}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-base cursor-pointer whitespace-nowrap"
              >
                {phaseSynced || isAlreadyDone ? '⚡ Turbine Synced!' : '⚡ SYNC TURBINE'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
