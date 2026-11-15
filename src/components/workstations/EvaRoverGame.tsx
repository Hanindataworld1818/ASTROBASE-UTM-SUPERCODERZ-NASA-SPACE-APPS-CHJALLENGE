import React, { useEffect, useRef, useState } from 'react';
import { MissionSiteConfig } from '../../game/nasaData';
import { EvaDustTargetState, SUIT_O2_DEBRIEF, computeRoverScrubStep, NasaTechToolId } from '../../game/rules';
import { spaceAudio } from '../../game/audio';
import { ToolLockOverlay } from '../ToolLockOverlay';

interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface EvaRoverGameProps {
  site: MissionSiteConfig;
  crewColor: string;
  isAlreadyDone: boolean;
  onComplete: (
    deltas: {
      bonusPowerKw?: number;
      science?: number;
      oxygen?: number;
      radiationMsv?: number;
      pantryDelta?: { h2oDrops?: number; spirulina?: number };
    },
    logNote: string
  ) => void;
  unlockedTools?: NasaTechToolId[];
  equippedTool?: NasaTechToolId;
  onEquipTool?: (bay: 'eva' | 'lifesupport' | 'hydroponics', toolId: NasaTechToolId) => void;
  onOpenShop?: () => void;
  onOpenQuickQuiz?: () => void;
}

function createEvaTargets(): Array<EvaDustTargetState & { label: string; kind: 'solar' | 'ice' }> {
  return [
    { id: 'wingA', label: 'Solar Wing Alpha', kind: 'solar', x: 165, y: 120, radius: 64, dustPct: 100 },
    { id: 'wingB', label: 'Solar Wing Beta', kind: 'solar', x: 475, y: 120, radius: 64, dustPct: 100 },
    { id: 'iceCore', label: 'Ice Drill Core', kind: 'ice', x: 320, y: 246, radius: 58, dustPct: 100 },
  ];
}

export const EvaRoverGame: React.FC<EvaRoverGameProps> = ({
  site,
  crewColor,
  isAlreadyDone,
  onComplete,
  unlockedTools = ['brush'],
  equippedTool = 'brush',
  onEquipTool,
  onOpenShop,
  onOpenQuickQuiz,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'playing' | 'failed' | 'completed'>(
    isAlreadyDone ? 'completed' : 'playing'
  );
  const [suitO2Pct, setSuitO2Pct] = useState<number>(isAlreadyDone ? 82 : 100);
  const [targetStats, setTargetStats] = useState<
    Array<{ id: string; label: string; cleanPct: number }>
  >(() =>
    createEvaTargets().map((t) => ({
      id: t.id,
      label: t.label,
      cleanPct: isAlreadyDone ? 100 : 0,
    }))
  );
  const [turboBrush, setTurboBrush] = useState<boolean>(false);
  const [telemetryStatus, setTelemetryStatus] = useState<'ready' | 'sending' | 'synced'>('ready');

  const isEdsEquipped = equippedTool === 'eds';
  const hasEds = unlockedTools.includes('eds');
  const dsnOneWayDelayLabel =
    site.id === 'moon' ? '~1.3 sec' : `${site.commDelayMinutes.toFixed(1)} min`;
  const simulatedDsnSyncDelayMs = Math.max(900, Math.round(site.commDelayMinutes * 100));

  useEffect(() => {
    if (!hasEds || phase !== 'completed') return;
    setTelemetryStatus('sending');
    const timeoutId = window.setTimeout(
      () => setTelemetryStatus('synced'),
      simulatedDsnSyncDelayMs
    );
    return () => window.clearTimeout(timeoutId);
  }, [hasEds, phase, simulatedDsnSyncDelayMs]);

  const simRef = useRef<{
    roverX: number;
    roverY: number;
    roverAngle: number;
    brushAngle: number;
    wheelPhase: number;
    suitO2: number;
    targets: Array<EvaDustTargetState & { label: string; kind: 'solar' | 'ice' }>;
    puffs: DustPuff[];
    keys: Record<string, boolean>;
    pointerGoal: { x: number; y: number } | null;
    manualDir: { dx: number; dy: number };
    completedSent: boolean;
  }>({
    roverX: 320,
    roverY: 165,
    roverAngle: 0,
    brushAngle: 0,
    wheelPhase: 0,
    suitO2: 100,
    targets: createEvaTargets(),
    puffs: [],
    keys: {},
    pointerGoal: null,
    manualDir: { dx: 0, dy: 0 },
    completedSent: isAlreadyDone,
  });

  const resetEvaMission = () => {
    simRef.current = {
      roverX: 320,
      roverY: 165,
      roverAngle: 0,
      brushAngle: 0,
      wheelPhase: 0,
      suitO2: 100,
      targets: createEvaTargets(),
      puffs: [],
      keys: {},
      pointerGoal: null,
      manualDir: { dx: 0, dy: 0 },
      completedSent: false,
    };
    setSuitO2Pct(100);
    setTargetStats(
      createEvaTargets().map((t) => ({ id: t.id, label: t.label, cleanPct: 0 }))
    );
    setPhase('playing');
    setTelemetryStatus('ready');
    spaceAudio.playBreakerClick(true);
  };

  // Keyboard navigation listener for EVA Rover (WASD + Arrows + Space Turbo Scrape)
  useEffect(() => {
    if (phase !== 'playing' || !hasEds) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        simRef.current.keys[k] = true;
        simRef.current.pointerGoal = null;
        if (k === ' ') setTurboBrush(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      simRef.current.keys[k] = false;
      if (k === ' ') setTurboBrush(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [hasEds, phase]);

  // 2D + 3D Blended Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerId = 0;
    let lastTime = performance.now();
    let uiAccum = 0;
    let cancelled = false;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.05, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const s = simRef.current;

      if (phase === 'playing' && hasEds) {
        // Astronaut Effort (Hardship) Calculation:
        // The mechanical scraper strains astronaut EVA suit O2 reserves (high fatigue, burns O2 1.4x faster)
        // EDS (Electrodynamic Dust Shield) uses electric fields, cutting crew physical exertion and saving O2
        const o2DrainMultiplier = isEdsEquipped ? 0.72 : 1.38;
        s.suitO2 = Math.max(0, s.suitO2 - dt * (2.2 * o2DrainMultiplier));

        if (s.suitO2 <= 0 && !s.completedSent) {
          setSuitO2Pct(0);
          setPhase('failed');
          spaceAudio.playBreakerClick(false);
        }

        // Steering velocity from keyboard, on-screen D-pad, or pointer goal
        let vx = s.manualDir.dx;
        let vy = s.manualDir.dy;
        if (s.keys['a'] || s.keys['arrowleft']) vx -= 1;
        if (s.keys['d'] || s.keys['arrowright']) vx += 1;
        if (s.keys['w'] || s.keys['arrowup']) vy -= 1;
        if (s.keys['s'] || s.keys['arrowdown']) vy += 1;

        if (vx === 0 && vy === 0 && s.pointerGoal) {
          const dx = s.pointerGoal.x - s.roverX;
          const dy = s.pointerGoal.y - s.roverY;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            vx = dx / dist;
            vy = dy / dist;
          } else {
            s.pointerGoal = null;
          }
        }

        const mag = Math.hypot(vx, vy);
        const speed = 185;
        if (mag > 0.05) {
          const nx = vx / mag;
          const ny = vy / mag;
          s.roverX = Math.max(46, Math.min(594, s.roverX + nx * speed * dt));
          s.roverY = Math.max(76, Math.min(286, s.roverY + ny * speed * dt));
          s.roverAngle = Math.atan2(ny, nx);
          s.wheelPhase += dt * 10;
        }

        const turboOn = Boolean(s.keys[' ']) || turboBrush;
        s.brushAngle += dt * (turboOn ? 14 : 7);

        // Scrape nearby solar panels or ice drill core:
        // EDS (Electrodynamic Dust Shield) cleans 3x faster by repelling charged dust grains!
        const toolSpeedMultiplier = isEdsEquipped ? 3.0 : 1.0;
        const scrubRate = (turboOn ? 62 : 40) * (mag > 0.05 ? 1.25 : 0.85) * toolSpeedMultiplier;

        const scrubResult = computeRoverScrubStep(
          s.roverX,
          s.roverY,
          s.targets,
          scrubRate * dt
        );
        s.targets = scrubResult.targets.map((nt, idx) => ({
          ...s.targets[idx],
          dustPct: nt.dustPct,
        }));

        if (scrubResult.scrubbedIds.length > 0 && Math.random() < 0.6) {
          const activeT = s.targets.find((t) => t.id === scrubResult.scrubbedIds[0]);
          if (activeT) {
            s.puffs.push({
              x: s.roverX + (Math.random() - 0.5) * 24,
              y: s.roverY + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * (isEdsEquipped ? 120 : 75),
              vy: -25 - Math.random() * (isEdsEquipped ? 70 : 45),
              life: isEdsEquipped ? 0.55 : 0.42,
              color: isEdsEquipped ? '#38BDF8' : activeT.kind === 'ice' ? '#7DD3FC' : '#D97706',
            });
          }
        }

        for (let i = s.puffs.length - 1; i >= 0; i--) {
          const p = s.puffs[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) s.puffs.splice(i, 1);
        }

        if (s.targets.every((t) => t.dustPct <= 0) && !s.completedSent) {
          s.completedSent = true;
          setPhase('completed');
          setTargetStats(
            s.targets.map((t) => ({ id: t.id, label: t.label, cleanPct: 100 }))
          );
          spaceAudio.playBreakerClick(true);
          onComplete(
            {
              bonusPowerKw: 1,
              science: 25,
              oxygen: isEdsEquipped ? -3 : -6,
              radiationMsv: 2.5,
              pantryDelta: { h2oDrops: 2, spirulina: 1 },
            },
            isEdsEquipped
              ? 'Deployed NASA EDS Electrodynamic Dust Shield: Cleaned arrays 3x faster, saved Suit O2 (+1 kW, +25 Sci)'
              : 'Drove EVA Rover, Cleaned Arrays & Drilled Ice Core (+1 kW, +2 H2O Drops, +1 Spirulina)'
          );
        }

        uiAccum += dt;
        if (uiAccum >= 0.1) {
          uiAccum = 0;
          setSuitO2Pct(Math.round(s.suitO2));
          setTargetStats(
            s.targets.map((t) => ({
              id: t.id,
              label: t.label,
              cleanPct: Math.round(100 - t.dustPct),
            }))
          );
        }
      }

      // === 2D + 3D BLENDED SURFACE RENDER ===
      // 1. Deep space horizon band
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 68);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, site.id === 'mars' ? '#431407' : '#0F172A');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 640, 68);

      // Stars & Horizon Planet Orb
      ctx.fillStyle = '#E2E8F0';
      [
        [45, 18],
        [120, 32],
        [210, 14],
        [370, 26],
        [490, 16],
        [590, 28],
      ].forEach(([sx, sy]) => {
        ctx.fillRect(sx, sy, 2, 2);
      });
      ctx.fillStyle = site.id === 'mars' ? '#FDE68A' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(540, 34, 15, 0, Math.PI * 2);
      ctx.fill();

      // 2. 2.5D Tilted Surface Ground Plane
      const groundGrad = ctx.createLinearGradient(0, 62, 0, 310);
      groundGrad.addColorStop(0, site.terrainAccent);
      groundGrad.addColorStop(1, site.terrainColor);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 62, 640, 248);

      // Distant 3D crater ridge silhouettes
      ctx.fillStyle = site.id === 'mars' ? '#290D04' : '#0F172A';
      ctx.beginPath();
      ctx.moveTo(0, 66);
      ctx.lineTo(90, 50);
      ctx.lineTo(190, 64);
      ctx.lineTo(310, 44);
      ctx.lineTo(440, 62);
      ctx.lineTo(540, 48);
      ctx.lineTo(640, 65);
      ctx.lineTo(640, 70);
      ctx.lineTo(0, 70);
      ctx.closePath();
      ctx.fill();

      // Perspective surface grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = -260; gx <= 900; gx += 95) {
        ctx.beginPath();
        ctx.moveTo(gx, 310);
        ctx.lineTo(320 + (gx - 320) * 0.18, 66);
        ctx.stroke();
      }

      // 3. Draw Cleaning Targets (Solar Wings Alpha/Beta & Ice Drill Core)
      for (const t of s.targets) {
        ctx.save();
        ctx.translate(t.x, t.y);

        if (t.kind === 'solar') {
          // Solar Panel Base (Diegetic Photovoltaic Wing)
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-46, -26, 92, 52, 8);
          ctx.fill();
          ctx.stroke();

          // Photovoltaic cells
          ctx.fillStyle = '#0284C7';
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
              ctx.fillRect(-40 + col * 28, -20 + row * 22, 24, 18);
            }
          }

          // EDS electric field pulse around solar panel if EDS is equipped!
          if (isEdsEquipped && t.dustPct > 0) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.roundRect(-52, -32, 104, 64, 12);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Clinging Regolith Dust Layer
          if (t.dustPct > 0) {
            ctx.fillStyle = site.id === 'mars' ? 'rgba(194, 65, 12, 0.88)' : 'rgba(100, 116, 139, 0.88)';
            ctx.beginPath();
            ctx.roundRect(-44, -24, 88, (48 * t.dustPct) / 100, 6);
            ctx.fill();
          }
        } else {
          // Ice Drill Core
          ctx.fillStyle = '#0C4A6E';
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#BAE6FD';
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.fill();

          if (t.dustPct > 0) {
            ctx.fillStyle = site.id === 'mars' ? 'rgba(154, 52, 18, 0.85)' : 'rgba(71, 85, 105, 0.85)';
            ctx.beginPath();
            ctx.arc(0, 0, (34 * t.dustPct) / 100, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Label & Clean Percent
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, 0, 38);
        ctx.fillStyle = t.dustPct <= 0 ? '#34D399' : '#F59E0B';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(t.dustPct <= 0 ? '✓ 100% CLEAN' : `${Math.round(100 - t.dustPct)}%`, 0, 50);

        ctx.restore();
      }

      // 4. Draw Rover + Cartoon Astronaut
      ctx.save();
      ctx.translate(s.roverX, s.roverY);

      // EDS Electric Repulsion Aura around Rover when equipped!
      if (isEdsEquipped) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36 + Math.sin(s.wheelPhase) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rover Wheels
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = isEdsEquipped ? '#38BDF8' : '#94A3B8';
      ctx.lineWidth = 2;
      [-16, 0, 16].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Chassis
      ctx.fillStyle = isEdsEquipped ? '#0284C7' : '#EA580C';
      ctx.beginPath();
      ctx.roundRect(-22, -6, 44, 16, 5);
      ctx.fill();
      ctx.fillStyle = isEdsEquipped ? '#38BDF8' : '#FB923C';
      ctx.beginPath();
      ctx.roundRect(-20, -10, 40, 12, 5);
      ctx.fill();

      // Cartoon Spaceman Astronaut Pilot
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-14, -23, 7, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = crewColor;
      ctx.beginPath();
      ctx.roundRect(-9, -22, 18, 15, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(-5, -19, 10, 8, 2.5);
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(8, -14, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, -30, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = crewColor;
      ctx.beginPath();
      ctx.roundRect(-8, -21, 16, 3.5, 1.5);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(2, -30, 8.2, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FDBA74';
      ctx.beginPath();
      ctx.ellipse(2, -29.5, 6.4, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0.5, -30.5, 1.2, 0, Math.PI * 2);
      ctx.arc(4.8, -30.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(2.6, -28.2, 2.2, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.beginPath();
      ctx.ellipse(2, -30, 8.2, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 5. Flying Particles
      for (const p of s.puffs) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, isEdsEquipped ? 5 : 4, 0, Math.PI * 2);
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
  }, [phase, site, crewColor, onComplete, turboBrush, isEdsEquipped, hasEds]);

  const steerTowardCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || !hasEds) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 640;
    const y = ((e.clientY - rect.top) / rect.height) * 310;
    simRef.current.pointerGoal = { x, y };
  };

  const setDPad = (dx: number, dy: number) => {
    if (!hasEds || phase !== 'playing') return;
    simRef.current.manualDir = { dx, dy };
    simRef.current.pointerGoal = null;
  };

  return (
    <div className="relative">
      <div
        className={`space-y-3 ${
          hasEds ? '' : 'pointer-events-none select-none opacity-40'
        }`}
        aria-hidden={!hasEds}
        inert={!hasEds}
      >
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-3 items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-slate-200">🎒 EVA Tools</span>
            <button
              type="button"
              onClick={() => onEquipTool?.('eva', 'brush')}
              className={`min-h-11 px-3 py-2 rounded-xl text-base font-bold transition-all cursor-pointer flex items-center gap-2 ${
                !isEdsEquipped
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🧹 NASA Apollo-Era Mechanical Scraper
            </button>
            {hasEds ? (
              <button
                type="button"
                onClick={() => onEquipTool?.('eva', 'eds')}
                className={`min-h-11 px-3 py-2 rounded-xl text-base font-bold transition-all cursor-pointer ${
                  isEdsEquipped
                    ? 'bg-cyan-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-cyan-300 hover:text-white'
                }`}
              >
                ⚡ EDS (Electrodynamic Dust Shield)
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShop}
                className="min-h-11 rounded-xl border border-slate-400/80 bg-slate-400/30 px-3 py-2 text-base font-bold text-cyan-100 transition-colors hover:bg-slate-400/50 cursor-pointer"
              >
                🔒 EDS · Buy in Shop
              </button>
            )}
          </div>
          <div className={`text-base font-bold ${isEdsEquipped ? 'text-cyan-300' : 'text-amber-300'}`}>
            {isEdsEquipped ? '⚡ EDS Active · 3x Speed · Zero Fatigue' : '⚠️ Scraper · Higher O₂ Use'}
            <span className="ml-2 text-slate-300">🌍 {site.name}</span>
          </div>
        </div>
        <div className="font-mono">
          <div className="mb-1 flex justify-between text-base font-bold">
            <span className="text-sky-300">🫁 EVA SUIT O₂</span>
            <span className={suitO2Pct <= 25 ? 'text-rose-400' : 'text-sky-300'}>
              {suitO2Pct}%
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-950">
            <div
              className={`h-full transition-all duration-150 ${
                suitO2Pct <= 25 ? 'bg-rose-500' : 'bg-sky-400'
              }`}
              style={{ width: `${suitO2Pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2D+3D Blended Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500/50 bg-[#050914]">
        <canvas
          ref={canvasRef}
          width={640}
          height={310}
          data-testid="eva-rover-canvas"
          onPointerDown={steerTowardCanvasPoint}
          onPointerMove={(e) => {
            if (e.buttons === 1) steerTowardCanvasPoint(e);
          }}
          className="w-full h-auto block cursor-pointer touch-none"
        />

        {/* Failed State: Full Consequence Debrief Card */}
        {phase === 'failed' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-2xl">
              🚨
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-400">
              {SUIT_O2_DEBRIEF.title}
            </div>
            <p className="text-base text-slate-100 max-w-lg leading-relaxed">
              <strong className="text-amber-300">NASA Consequence:</strong> {SUIT_O2_DEBRIEF.nasaConsequence}
            </p>
            <p className="text-base text-cyan-100 max-w-lg italic">
              <strong className="text-cyan-400">Junior Astronaut Lesson:</strong> {SUIT_O2_DEBRIEF.kidLesson}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={resetEvaMission}
                className="min-h-12 px-5 py-3 rounded-xl bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-base cursor-pointer shadow-lg"
              >
                Recharge O2 &amp; Retry Spacewalk
              </button>
              {onOpenShop && !hasEds && (
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="min-h-12 px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-base cursor-pointer shadow-lg"
                >
                  Buy NASA EDS in Shop 🎒
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target Clean Meters + Accessible Drive Pad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div className="grid grid-cols-3 gap-2">
          {targetStats.map((t) => (
            <div
              key={t.id}
              className={`p-2.5 rounded-xl border text-center ${
                t.cleanPct >= 100
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <div className="text-base font-bold truncate">{t.label}</div>
              <div className="text-lg font-mono font-extrabold tabular-nums mt-0.5">
                {t.cleanPct}%
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 mt-1 overflow-hidden">
                <div
                  className={`h-full ${t.cleanPct >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`}
                  style={{ width: `${t.cleanPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tactile On-Screen Rover Controls */}
        {phase === 'playing' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Drive Rover Left"
                onPointerDown={() => setDPad(-1, 0)}
                onPointerUp={() => setDPad(0, 0)}
                onPointerLeave={() => setDPad(0, 0)}
                onClick={() => {
                  simRef.current.pointerGoal = {
                    x: Math.max(50, simRef.current.roverX - 70),
                    y: simRef.current.roverY,
                  };
                }}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold cursor-pointer"
              >
                ◄
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Drive Rover Up"
                  onPointerDown={() => setDPad(0, -1)}
                  onPointerUp={() => setDPad(0, 0)}
                  onPointerLeave={() => setDPad(0, 0)}
                  onClick={() => {
                    simRef.current.pointerGoal = {
                      x: simRef.current.roverX,
                      y: Math.max(80, simRef.current.roverY - 55),
                    };
                  }}
                  className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold cursor-pointer"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Drive Rover Down"
                  onPointerDown={() => setDPad(0, 1)}
                  onPointerUp={() => setDPad(0, 0)}
                  onPointerLeave={() => setDPad(0, 0)}
                  onClick={() => {
                    simRef.current.pointerGoal = {
                      x: simRef.current.roverX,
                      y: Math.min(280, simRef.current.roverY + 55),
                    };
                  }}
                  className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold cursor-pointer"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                aria-label="Drive Rover Right"
                onPointerDown={() => setDPad(1, 0)}
                onPointerUp={() => setDPad(0, 0)}
                onPointerLeave={() => setDPad(0, 0)}
                onClick={() => {
                  simRef.current.pointerGoal = {
                    x: Math.min(590, simRef.current.roverX + 70),
                    y: simRef.current.roverY,
                  };
                }}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold cursor-pointer"
              >
                ►
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTurboBrush((v) => !v)}
              className={`min-h-12 px-4 py-3 rounded-xl font-bold text-base cursor-pointer ${
                turboBrush
                  ? 'bg-orange-400 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-orange-300 border border-orange-500/40'
              }`}
            >
              🛠️ Turbo Scrape: {turboBrush ? 'ON' : 'OFF'}
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-400 text-base font-mono text-emerald-100">
            ✓ EVA COMPLETE (+1 kW Power, +25 Science, -6% O2, +2.5 mSv)
          </div>
        )}
      </div>
      {phase === 'completed' && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-base font-mono ${
            telemetryStatus === 'synced'
              ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-200'
              : 'border-cyan-500/60 bg-cyan-950/50 text-cyan-200'
          }`}
        >
          {telemetryStatus === 'synced' ? '✅ ROVER TELEMETRY SYNCED TO NASA DSN' : '📡 SENDING ROVER TELEMETRY TO NASA DSN…'}
          <span className="ml-2 text-slate-200">
            One-way delay {dsnOneWayDelayLabel}; simulated with an accelerated mission clock.
          </span>
        </div>
      )}
      </div>
      {!hasEds && (
        <ToolLockOverlay
          requiredTool="EDS (Electrodynamic Dust Shield)"
          onOpenQuickQuiz={onOpenQuickQuiz}
          onOpenShop={onOpenShop}
        />
      )}
    </div>
  );
};
