import React, { useEffect, useRef, useState } from 'react';
import { spaceAudio } from '../../game/audio';
import { CO2_CLOG_DEBRIEF, NasaTechToolId } from '../../game/rules';
import { ToolLockOverlay } from '../ToolLockOverlay';

interface GrimeBlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hue: string;
}

interface ZapSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface ElectrolyzerZapperGameProps {
  isAlreadyDone: boolean;
  onComplete: (
    deltas: { oxygen?: number; science?: number; pantryDelta?: { h2oDrops?: number } },
    logNote: string
  ) => void;
  unlockedTools?: NasaTechToolId[];
  equippedTool?: NasaTechToolId | '';
  onEquipTool?: (bay: 'eva' | 'lifesupport' | 'hydroponics', toolId: NasaTechToolId) => void;
  onOpenShop?: () => void;
  onOpenQuickQuiz?: () => void;
}

const TOTAL_BLOBS = 8;

function createInitialBlobs(): GrimeBlob[] {
  const palette = ['#84CC16', '#A3E635', '#65A30D', '#CA8A04'];
  return Array.from({ length: TOTAL_BLOBS }).map((_, i) => ({
    id: i + 1,
    x: 85 + ((i * 63) % 410),
    y: 55 + ((i * 47) % 145),
    vx: (i % 2 === 0 ? 1 : -1) * (48 + (i % 3) * 18),
    vy: (i % 3 === 0 ? 1 : -1) * (34 + (i % 2) * 20),
    radius: 20 + (i % 2) * 4,
    hp: 100,
    maxHp: 100,
    hue: palette[i % palette.length],
  }));
}

export const ElectrolyzerZapperGame: React.FC<ElectrolyzerZapperGameProps> = ({
  isAlreadyDone,
  onComplete,
  unlockedTools = [],
  equippedTool = '',
  onEquipTool,
  onOpenShop,
  onOpenQuickQuiz,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gamePhase, setGamePhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [zappedCount, setZappedCount] = useState<number>(isAlreadyDone ? TOTAL_BLOBS : 0);
  const [co2Level, setCo2Level] = useState<number>(isAlreadyDone ? 0 : 12);

  const hasPcoBeam = unlockedTools.includes('pco_beam');
  const isPcoEquipped = equippedTool === 'pco_beam';
  const hasZeoliteSieve = unlockedTools.includes('zeolite_sieve');
  const hasRequiredTool = hasPcoBeam || hasZeoliteSieve;

  const stateRef = useRef<{
    blobs: GrimeBlob[];
    sparks: ZapSpark[];
    aimX: number;
    aimY: number;
    firing: boolean;
    laserFlashTimer: number;
    co2: number;
    zapped: number;
    fanAngle: number;
    completedSent: boolean;
  }>({
    blobs: createInitialBlobs(),
    sparks: [],
    aimX: 290,
    aimY: 125,
    firing: false,
    laserFlashTimer: 0,
    co2: 12,
    zapped: 0,
    fanAngle: 0,
    completedSent: isAlreadyDone,
  });

  const fireLaserAt = (targetX: number, targetY: number) => {
    const s = stateRef.current;
    if (!hasRequiredTool || gamePhase !== 'playing' || s.completedSent) return;
    s.aimX = targetX;
    s.aimY = targetY;
    s.laserFlashTimer = 0.16;

    // PCO UV-C Purifier Beam provides 2.5x wider cleaning radius (38px vs 16px) & higher neutralization damage
    const hitTolerance = isPcoEquipped ? 38 : 16;
    const damageAmount = isPcoEquipped ? 75 : 55;

    let hitAny = false;
    for (let i = s.blobs.length - 1; i >= 0; i--) {
      const b = s.blobs[i];
      const dist = Math.hypot(b.x - targetX, b.y - targetY);
      if (dist <= b.radius + hitTolerance) {
        hitAny = true;
        b.hp -= damageAmount;
        for (let k = 0; k < (isPcoEquipped ? 12 : 8); k++) {
          const ang = (Math.PI * 2 * k) / 8;
          s.sparks.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(ang) * (isPcoEquipped ? 140 : 110),
            vy: Math.sin(ang) * (isPcoEquipped ? 140 : 110),
            life: 0.38,
            color: isPcoEquipped ? '#C084FC' : b.hp <= 0 ? '#38BDF8' : '#FACC15',
          });
        }
        if (b.hp <= 0) {
          s.blobs.splice(i, 1);
          s.zapped += 1;
          s.co2 = Math.max(0, s.co2 - 10);
          setZappedCount(s.zapped);
          spaceAudio.playBreakerClick(true);
          if (s.zapped >= TOTAL_BLOBS && !s.completedSent) {
            s.completedSent = true;
            setGamePhase('completed');
            setCo2Level(0);
            onComplete(
              { oxygen: 8, science: 20, pantryDelta: { h2oDrops: 3 } },
              'Neutralized all 8 airborne VOCs and micro-particulates with PCO & Molecular Sieves (+8% O2, +3 H2O Drops)'
            );
          }
        } else {
          spaceAudio.playBreakerClick(true);
        }
        if (!isPcoEquipped) break; // Standard laser hits 1 target; PCO beam hits all in wide radius
      }
    }
    if (!hitAny) {
      s.sparks.push({
        x: targetX,
        y: targetY,
        vx: 0,
        vy: -20,
        life: 0.2,
        color: isPcoEquipped ? '#A855F7' : '#38BDF8',
      });
    }
  };

  const resetZapperTask = () => {
    if (!hasRequiredTool) return;
    stateRef.current = {
      blobs: createInitialBlobs(),
      sparks: [],
      aimX: 290,
      aimY: 125,
      firing: false,
      laserFlashTimer: 0,
      co2: 12,
      zapped: 0,
      fanAngle: 0,
      completedSent: false,
    };
    setZappedCount(0);
    setCo2Level(12);
    setGamePhase('playing');
    spaceAudio.playBreakerClick(true);
  };

  useEffect(() => {
    if (!hasRequiredTool) stateRef.current.firing = false;
  }, [hasRequiredTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;
    let cancelled = false;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const s = stateRef.current;

      if (gamePhase === 'playing' && hasRequiredTool) {
        s.fanAngle += dt * (1.5 + s.zapped * 0.6);
        if (s.laserFlashTimer > 0) s.laserFlashTimer = Math.max(0, s.laserFlashTimer - dt);

        // CO2 & VOC accumulation based on active airborne particulates.
        // Zeolite Molecular Sieve passively slows buildup rate by 40% (0.6x)!
        const remainingRatio = Math.max(0.2, s.blobs.length / TOTAL_BLOBS);
        const sieveRateMultiplier = hasZeoliteSieve ? 0.6 : 1.0;
        s.co2 = Math.min(100, s.co2 + dt * (4.4 * remainingRatio * sieveRateMultiplier));

        if (s.co2 >= 100 && s.zapped < TOTAL_BLOBS) {
          setCo2Level(100);
          setGamePhase('failed');
          spaceAudio.playBreakerClick(false);
        }

        // Move VOC grime particulates and bounce smoothly inside revitalization chamber
        for (const b of s.blobs) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < b.radius + 16 || b.x > 580 - b.radius - 16) {
            b.vx *= -1;
            b.x = Math.max(b.radius + 16, Math.min(580 - b.radius - 16, b.x));
          }
          if (b.y < b.radius + 18 || b.y > 238 - b.radius) {
            b.vy *= -1;
            b.y = Math.max(b.radius + 18, Math.min(238 - b.radius, b.y));
          }
        }

        // Continuous PCO UV-C burn if mouse/pointer is held down
        if (s.firing) {
          s.laserFlashTimer = 0.09;
          const hitTolerance = isPcoEquipped ? 38 : 14;
          const burnDamage = isPcoEquipped ? 220 : 160;

          for (let i = s.blobs.length - 1; i >= 0; i--) {
            const b = s.blobs[i];
            if (Math.hypot(b.x - s.aimX, b.y - s.aimY) <= b.radius + hitTolerance) {
              b.hp -= dt * burnDamage;
              if (Math.random() < 0.45) {
                s.sparks.push({
                  x: b.x + (Math.random() - 0.5) * 14,
                  y: b.y + (Math.random() - 0.5) * 14,
                  vx: (Math.random() - 0.5) * 90,
                  vy: (Math.random() - 0.5) * 90,
                  life: 0.25,
                  color: isPcoEquipped ? '#A855F7' : '#38BDF8',
                });
              }
              if (b.hp <= 0) {
                s.blobs.splice(i, 1);
                s.zapped += 1;
                s.co2 = Math.max(0, s.co2 - 10);
                setZappedCount(s.zapped);
                spaceAudio.playBreakerClick(true);
                if (s.zapped >= TOTAL_BLOBS && !s.completedSent) {
                  s.completedSent = true;
                  setGamePhase('completed');
                  setCo2Level(0);
                  onComplete(
                    { oxygen: 8, science: 20, pantryDelta: { h2oDrops: 3 } },
                    'Neutralized all 8 airborne VOCs and micro-particulates with PCO & Molecular Sieves (+8% O2, +3 H2O Drops)'
                  );
                }
              }
            }
          }
        }

        for (let i = s.sparks.length - 1; i >= 0; i--) {
          const p = s.sparks[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.sparks.splice(i, 1);
        }

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.12) {
          uiSyncAccum = 0;
          setCo2Level(Math.round(s.co2));
        }
      } else {
        s.fanAngle += dt * 3.5;
      }

      // Draw Air Revitalization Chamber
      ctx.fillStyle = '#050914';
      ctx.fillRect(0, 0, 580, 260);

      // Background grid & titanium dioxide (TiO2) catalytic lattice glow
      ctx.strokeStyle = isPcoEquipped ? 'rgba(168, 85, 247, 0.18)' : 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < 580; gx += 45) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 260);
        ctx.stroke();
      }
      for (let gy = 40; gy < 260; gy += 45) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(580, gy);
        ctx.stroke();
      }

      // 4 Spinning ECLSS Molecular Sieve & Scrubber Vents in backdrop
      [95, 225, 355, 485].forEach((vx) => {
        ctx.save();
        ctx.translate(vx, 128);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = gamePhase === 'failed' ? '#FB7185' : hasZeoliteSieve ? '#A855F7' : '#0284C7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(s.fanAngle);
        ctx.fillStyle = gamePhase === 'completed' ? '#38BDF8' : '#334155';
        for (let b = 0; b < 4; b++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.roundRect(-5, -28, 10, 22, 4);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Airborne VOC & Particulate Blobs
      for (const b of s.blobs) {
        ctx.save();
        ctx.translate(b.x, b.y);
        // Contaminant aerosol aura
        ctx.fillStyle = 'rgba(132, 204, 22, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Blob body
        ctx.fillStyle = b.hue;
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Label: VOC contaminant
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VOC', 0, 4);

        // Mini HP bar if damaged
        if (b.hp < b.maxHp) {
          ctx.fillStyle = '#090E1A';
          ctx.fillRect(-16, -b.radius - 9, 32, 5);
          ctx.fillStyle = isPcoEquipped ? '#C084FC' : '#38BDF8';
          ctx.fillRect(-16, -b.radius - 9, (32 * Math.max(0, b.hp)) / b.maxHp, 5);
        }
        ctx.restore();
      }

      // Draw PCO UV-C Emitter Nozzle at bottom-center + Active Purifier Beam
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = isPcoEquipped ? '#A855F7' : '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(268, 240, 44, 20, 6);
      ctx.fill();
      ctx.stroke();

      if (gamePhase === 'playing') {
        // Targeting beam line
        const beamColor = isPcoEquipped ? '#C084FC' : '#38BDF8';
        const beamGlow = isPcoEquipped ? 'rgba(192, 132, 252, 0.35)' : 'rgba(56, 189, 248, 0.25)';
        ctx.strokeStyle = s.laserFlashTimer > 0 ? beamColor : beamGlow;
        ctx.lineWidth = s.laserFlashTimer > 0 ? (isPcoEquipped ? 9 : 5) : 1.5;
        ctx.beginPath();
        ctx.moveTo(290, 242);
        ctx.lineTo(s.aimX, s.aimY);
        ctx.stroke();

        if (s.laserFlashTimer > 0) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = isPcoEquipped ? 3.5 : 2;
          ctx.beginPath();
          ctx.moveTo(290, 242);
          ctx.lineTo(s.aimX, s.aimY);
          ctx.stroke();
        }

        // Crosshair reticle (wider 2.5x radius for PCO UV-C beam)
        const crosshairRadius = isPcoEquipped ? 32 : 14;
        ctx.strokeStyle = isPcoEquipped ? '#C084FC' : '#38BDF8';
        ctx.lineWidth = isPcoEquipped ? 2.5 : 2;
        ctx.beginPath();
        ctx.arc(s.aimX, s.aimY, crosshairRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (isPcoEquipped) {
          // Radiative PCO UV-C corona field
          ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
          ctx.beginPath();
          ctx.arc(s.aimX, s.aimY, crosshairRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(s.aimX - (crosshairRadius + 8), s.aimY);
        ctx.lineTo(s.aimX + (crosshairRadius + 8), s.aimY);
        ctx.moveTo(s.aimX, s.aimY - (crosshairRadius + 8));
        ctx.lineTo(s.aimX, s.aimY + (crosshairRadius + 8));
        ctx.stroke();
      }

      // Sparks
      for (const p of s.sparks) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isPcoEquipped ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      timerId = window.setTimeout(() => loop(performance.now()), 20);
    };

    timerId = window.setTimeout(() => loop(performance.now()), 20);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [gamePhase, onComplete, isPcoEquipped, hasZeoliteSieve, hasRequiredTool]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 580;
    const y = ((e.clientY - rect.top) / rect.height) * 260;
    return { x, y };
  };

  return (
    <div className="relative">
      <div
        className={`space-y-2 ${hasRequiredTool ? '' : 'pointer-events-none select-none opacity-40'}`}
        aria-hidden={!hasRequiredTool}
        inert={!hasRequiredTool}
      >
      {/* Tool Selection Bar from Backpack */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-300">
            🎒 O₂ TOOLS
          </span>
          {hasPcoBeam ? (
            <button
              type="button"
              onClick={() => onEquipTool?.('lifesupport', 'pco_beam')}
              disabled={isPcoEquipped}
              className={`min-h-11 px-3 py-2 rounded-xl text-base font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                isPcoEquipped
                  ? 'bg-purple-600 text-white shadow-lg cursor-default'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <span>🔬</span>
              <span>{isPcoEquipped ? '✓ PCO UV-C Purifier Equipped (2.5x Radius)' : 'Equip PCO UV Beam'}</span>
            </button>
          ) : (
            <div className="relative min-h-10 overflow-hidden rounded-xl border border-slate-500/80">
              <div
                aria-hidden="true"
                className="flex h-full min-h-10 items-center gap-2 bg-slate-800 px-3 text-base font-bold text-purple-300 opacity-40"
              >
                <span>🔬</span>
                <span>PCO UV-C Purifier · 2.5x radius</span>
              </div>
              <button
                type="button"
                onClick={onOpenShop}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-400/45 px-3 py-1 text-center text-slate-950 backdrop-blur-[1px] transition-colors hover:bg-slate-300/60 cursor-pointer"
              >
                <span className="text-sm font-extrabold">🔒 TOOL REQUIRED</span>
                <span className="text-base font-bold">🔒 Buy PCO Purifier in Shop</span>
              </button>
            </div>
          )}
        </div>

        {/* Zeolite Sieve Status */}
        <div className="flex items-center gap-2 text-base font-mono">
          {hasZeoliteSieve ? (
            <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-500/50 text-purple-300 font-bold flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Zeolite Sieve Active (-40% CO2 rise)</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenShop}
              className="text-slate-300 hover:text-cyan-200 transition-colors cursor-pointer text-base"
            >
              + Unlock Zeolite Sieve (-40% CO2 rate) ↗
            </button>
          )}
        </div>
      </div>

      {/* Main Task Header Card with Real NASA ISS ECLSS Science */}
      <div className="p-3 rounded-2xl bg-[#090E1A] border border-sky-500/40 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-[240px]">
          <div className="text-xl font-bold text-sky-300">
            🫧 NASA ISS Air Purifier · UV-C
          </div>
          <p className="text-base text-slate-200">
            Tap floating VOCs before CO₂ reaches 100%!
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div className="text-right">
            <div className="text-base text-slate-300">VOCs PURIFIED</div>
            <div className="text-xl font-bold text-sky-300 tabular-nums">
              {zappedCount}/{TOTAL_BLOBS}
            </div>
          </div>
          <div className="w-36">
            <div className="flex justify-between text-base mb-1">
              <span className="text-slate-400">CO2 &amp; VOC BUILDUP</span>
              <span
                className={`font-bold tabular-nums ${
                  co2Level >= 75 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {co2Level}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  co2Level >= 75 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${co2Level}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Canvas PCO UV-C Arena */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-[#050914]">
        <canvas
          ref={canvasRef}
          width={580}
          height={260}
          data-testid="electrolyzer-zapper-canvas"
          onPointerMove={(e) => {
            if (!hasRequiredTool) return;
            const { x, y } = toCanvasCoords(e);
            stateRef.current.aimX = x;
            stateRef.current.aimY = y;
          }}
          onPointerDown={(e) => {
            if (!hasRequiredTool) return;
            const { x, y } = toCanvasCoords(e);
            stateRef.current.firing = true;
            fireLaserAt(x, y);
          }}
          onPointerUp={() => {
            stateRef.current.firing = false;
          }}
          onPointerLeave={() => {
            stateRef.current.firing = false;
          }}
          className="w-full h-auto block cursor-crosshair touch-none"
        />

        {/* Failed State: Full NASA Consequence Debrief Card */}
        {gamePhase === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-2xl">
              💨
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-400">
              {CO2_CLOG_DEBRIEF.title}
            </div>
            <p className="text-base text-slate-100 max-w-lg leading-relaxed">
              <strong className="text-amber-300">NASA Consequence:</strong> {CO2_CLOG_DEBRIEF.nasaConsequence}
            </p>
            <p className="text-base text-cyan-100 max-w-lg italic">
              <strong className="text-cyan-400">Junior Astronaut Lesson:</strong> {CO2_CLOG_DEBRIEF.kidLesson}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={resetZapperTask}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-base cursor-pointer shadow-lg"
              >
                Reset Purge Valve &amp; Retry Task
              </button>
              {onOpenShop && !hasZeoliteSieve && (
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="min-h-11 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-base cursor-pointer shadow-lg"
                >
                  Buy Zeolite Sieve in Shop 🎒
                </button>
              )}
            </div>
          </div>
        )}

        {gamePhase === 'completed' && (
          <div className="p-3 bg-emerald-950/80 border-t border-emerald-500/50 flex items-center justify-between text-base font-mono text-emerald-100">
            <span>✓ ALL 8 AIRBORNE VOCS &amp; PARTICULATES NEUTRALIZED · CABIN AIR PURITY 100% (+8% O2 &amp; +20 Science)</span>
            <span>PCO UV BEAM STANDBY</span>
          </div>
        )}
      </div>

      {/* Accessible Auto-Lock Helper Button */}
      {gamePhase === 'playing' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-base font-mono text-slate-200 tabular-nums">
            🎯 PCO Beam · {isPcoEquipped ? 'Wide UV-C' : 'Standard Focus'}
          </div>
          <button
            type="button"
            onClick={() => {
              const first = stateRef.current.blobs[0];
              if (first) {
                fireLaserAt(first.x, first.y);
              }
            }}
            className="min-h-11 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-base cursor-pointer"
          >
            ⚡ Purge Nearest VOC
          </button>
        </div>
      )}
      </div>
      {!hasRequiredTool && (
        <ToolLockOverlay
          requiredTool="PCO UV-C Purifier Beam or Zeolite Molecular Sieve"
          onOpenQuickQuiz={onOpenQuickQuiz}
          onOpenShop={onOpenShop}
        />
      )}
    </div>
  );
};
