import React, { useEffect, useRef, useState } from 'react';
import {
  CSA_HYDROPONIC_CROPS,
  CropIngredientId,
  CropLabSelectionMap,
  CropPantryInventory,
  GameStateSnapshot,
  SPACE_RECIPES,
  SpaceKitchenRecipe,
  calculateCsaCropLabSimulation,
  calculateNutritionExplorerHealth,
  canCookSpaceRecipe,
} from '../../game/rules';
import { spaceAudio } from '../../game/audio';

interface SpaceFoodLabGameProps {
  gameState: GameStateSnapshot;
  pantry: CropPantryInventory;
  crewColor: string;
  mealsCookedTotal: number;
  isAlreadyDone: boolean;
  onForageStarterSprouts: () => void;
  onCookAndFeedCrew: (recipe: SpaceKitchenRecipe) => void;
}

const DEFAULT_CROP_SELECTIONS: CropLabSelectionMap = {
  mizuna: 2,
  wheat: 2,
  radish: 1,
  berries: 2,
  microgreens: 1,
  spirulina: 2,
};

const CROP_KID_TAGS: Record<CropIngredientId, string> = {
  mizuna: 'Vitamin K & C',
  wheat: 'High Energy',
  radish: 'Crunchy Boost',
  berries: 'Space Antioxidant',
  microgreens: 'Fresh Vitamins',
  spirulina: 'Protein Power',
};

const CREW_DINERS = [
  { id: 'you', name: 'YOU (CADET)', color: '#38BDF8', quote: 'Crunchy space veggies!' },
  { id: 'han', name: 'Commander-Han', color: '#EF4444', quote: 'Ready to explore new horizons!' },
  { id: 'feng', name: 'Tech-Feng', color: '#F59E0B', quote: 'Fuel for rover driving & sports!' },
  { id: 'xin', name: 'Bio-Xin', color: '#10B981', quote: 'Crystal-clear CSA nutrition!' },
  { id: 'kun', name: 'Shield-Kun', color: '#A855F7', quote: 'Planned dessert & crew dance!' },
] as const;

export const SpaceFoodLabGame: React.FC<SpaceFoodLabGameProps> = ({
  gameState,
  pantry,
  crewColor,
  mealsCookedTotal,
  isAlreadyDone,
  onForageStarterSprouts,
  onCookAndFeedCrew,
}) => {
  const [subTab, setSubTab] = useState<'lab' | 'kitchen'>('lab');
  const enteredAstronautName = gameState.astronautName.trim();
  const playerDinerName =
    enteredAstronautName && enteredAstronautName !== 'Junior Astronaut'
      ? `YOU (${enteredAstronautName.toUpperCase()})`
      : 'YOU (CADET)';

  // === NUTRITION EXPLORER: LIVE BASE HEALTH METER FROM HARVESTED & PROCESSED CROPS ===
  const baseHealth = calculateNutritionExplorerHealth(gameState);

  // === TAB 1: CSA HYDROPONIC CROP & NUTRITION VISUALIZER ===
  const [cropSelections, setCropSelections] = useState<CropLabSelectionMap>(DEFAULT_CROP_SELECTIONS);
  const sim = calculateCsaCropLabSimulation(cropSelections);

  const adjustCrop = (id: CropIngredientId, delta: number) => {
    spaceAudio.playBreakerClick(delta > 0);
    setCropSelections((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(6, (prev[id] || 0) + delta)),
    }));
  };

  // === TAB 2: GRAPHICAL SPACE KITCHEN (OBTAIN -> MIX -> BAKE -> FEED CREW) ===
  const [cookStage, setCookStage] = useState<'select' | 'mix' | 'bake' | 'bake_failed' | 'eat' | 'done'>(
    isAlreadyDone ? 'done' : 'select'
  );
  const [selectedRecipe, setSelectedRecipe] = useState<SpaceKitchenRecipe>(SPACE_RECIPES[0]);
  const [mixerItems, setMixerItems] = useState<
    Array<{ uid: string; label: string; emoji: string; x: number; y: number; collected: boolean }>
  >([]);
  const [foragedThisModal, setForagedThisModal] = useState<boolean>(false);

  // Galley Thermal Oven states
  const [ovenTemp, setOvenTemp] = useState<number>(52);
  const [bakeProgress, setBakeProgress] = useState<number>(0);
  const heatingRef = useRef<boolean>(false);

  // Crew Dining Table feeding states
  const [fedDiners, setFedDiners] = useState<Record<string, boolean>>({});
  const fedCount = Object.values(fedDiners).filter(Boolean).length;

  const ovenTempRef = useRef<number>(52);
  const bakeProgressRef = useRef<number>(0);

  // Oven thermal physics + golden-zone bake progress in one steady 100ms loop
  useEffect(() => {
    if (cookStage !== 'bake') return;
    ovenTempRef.current = ovenTemp;
    bakeProgressRef.current = bakeProgress;
    const id = window.setInterval(() => {
      const delta = heatingRef.current ? 4.5 : -1.6;
      const nextTemp = Math.max(15, Math.min(100, Number((ovenTempRef.current + delta).toFixed(1))));
      ovenTempRef.current = nextTemp;
      setOvenTemp(nextTemp);

      if (nextTemp >= 98) {
        heatingRef.current = false;
        setCookStage('bake_failed');
        spaceAudio.playBreakerClick(false);
        return;
      }

      if (nextTemp >= 58 && nextTemp <= 88) {
        const nextProg = Math.min(100, Math.round(bakeProgressRef.current + 5));
        bakeProgressRef.current = nextProg;
        setBakeProgress(nextProg);
        if (nextProg >= 100) {
          heatingRef.current = false;
          setCookStage('eat');
          spaceAudio.playBreakerClick(true);
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [cookStage]);

  const startCookingRecipe = (recipe: SpaceKitchenRecipe) => {
    if (!canCookSpaceRecipe(pantry, recipe)) return;
    setSelectedRecipe(recipe);

    // Build floating Zero-G ingredient orbs from recipe cost
    const orbs: Array<{
      uid: string;
      label: string;
      emoji: string;
      x: number;
      y: number;
      collected: boolean;
    }> = [];
    const emojiMap: Record<keyof CropPantryInventory, { emoji: string; label: string }> = {
      mizuna: { emoji: '🥬', label: 'Mizuna' },
      wheat: { emoji: '🌾', label: 'Wheat' },
      radish: { emoji: '🌱', label: 'Radish' },
      berries: { emoji: '🍓', label: 'Berries' },
      microgreens: { emoji: '🥗', label: 'Greens' },
      spirulina: { emoji: '🫧', label: 'Spirulina' },
      h2oDrops: { emoji: '💧', label: 'H2O Drop' },
    };
    const spots = [
      { x: 18, y: 24 },
      { x: 78, y: 26 },
      { x: 22, y: 74 },
      { x: 78, y: 74 },
      { x: 50, y: 18 },
      { x: 50, y: 80 },
    ];
    let sIdx = 0;
    for (const [k, count] of Object.entries(recipe.cost)) {
      const key = k as keyof CropPantryInventory;
      for (let i = 0; i < (count || 0); i++) {
        const pos = spots[sIdx % spots.length];
        orbs.push({
          uid: `${key}-${i}-${sIdx}`,
          label: emojiMap[key].label,
          emoji: emojiMap[key].emoji,
          x: pos.x,
          y: pos.y,
          collected: false,
        });
        sIdx++;
      }
    }

    setMixerItems(orbs);
    setOvenTemp(54);
    setBakeProgress(0);
    setFedDiners({});
    setCookStage('mix');
    spaceAudio.playBreakerClick(true);
  };

  const collectMixerOrb = (uid: string) => {
    spaceAudio.playBreakerClick(true);
    setMixerItems((prev) => {
      const next = prev.map((it) => (it.uid === uid ? { ...it, collected: true } : it));
      if (next.every((it) => it.collected)) {
        window.setTimeout(() => {
          setCookStage('bake');
          setOvenTemp(66);
          setBakeProgress(10);
        }, 250);
      }
      return next;
    });
  };

  const serveCrewmate = (dinerId: string) => {
    if (cookStage !== 'eat' || fedDiners[dinerId]) return;
    spaceAudio.playBreakerClick(true);
    const next = { ...fedDiners, [dinerId]: true };
    setFedDiners(next);
    if (CREW_DINERS.every((d) => next[d.id])) {
      setCookStage('done');
      onCookAndFeedCrew(selectedRecipe);
    }
  };

  const pantryBadgeList: Array<{ key: keyof CropPantryInventory; emoji: string; label: string }> = [
    { key: 'mizuna', emoji: '🥬', label: 'Mizuna' },
    { key: 'wheat', emoji: '🌾', label: 'Wheat' },
    { key: 'radish', emoji: '🌱', label: 'Radish' },
    { key: 'berries', emoji: '🍓', label: 'Berries' },
    { key: 'microgreens', emoji: '🥗', label: 'Microgreens' },
    { key: 'spirulina', emoji: '🫧', label: 'Spirulina' },
    { key: 'h2oDrops', emoji: '💧', label: 'H2O' },
  ];

  return (
    <div className="space-y-1">
      {/* NUTRITION EXPLORER: REAL-TIME BASE HEALTH METER (BASED ON HARVESTED & PROCESSED CROPS) */}
      {subTab === 'lab' && (
        <div
          data-testid="nutrition-explorer-panel"
          className="p-2 rounded-2xl bg-[#070E1A] border-2 border-emerald-500/50 flex flex-wrap items-center justify-between gap-2"
        >
        <div className="flex min-w-[230px] flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 font-mono text-base font-extrabold ${
              baseHealth.healthMeterScore >= 82
                ? 'border-emerald-400 text-emerald-300'
                : baseHealth.healthMeterScore >= 55
                ? 'border-cyan-400 text-cyan-300'
                : 'border-amber-400 text-amber-300'
            }`}
            role="img"
            aria-label={`Crew health ${baseHealth.healthMeterScore}%`}
          >
            {baseHealth.healthMeterScore}%
          </div>
          <div className="text-base font-bold text-white">
            🌱 CREW FUEL · {baseHealth.statusLabel}
          </div>
          <div className="text-base font-semibold text-cyan-200 tabular-nums">
            🌿 {baseHealth.harvestedUnitsCount} · 🍲 {baseHealth.processedMealsCount} · 🎒 {baseHealth.pantryStockUnits}
          </div>
        </div>
        <div>
          <button
            type="button"
            disabled={foragedThisModal}
            onClick={() => {
              setForagedThisModal(true);
              onForageStarterSprouts();
              spaceAudio.playBreakerClick(true);
            }}
            className="min-h-11 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-slate-950 font-bold text-base cursor-pointer"
          >
            {foragedThisModal ? '✓ Sprouts Added' : '🌱 Pick Sprouts'}
          </button>
        </div>
      </div>
      )}

      {/* Sub-Navigation between CSA Visual Crop Lab and Interactive Astro-Kitchen */}
      <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => setSubTab('lab')}
          className={`flex-1 py-2 px-3 rounded-lg text-base font-bold cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'lab'
              ? 'bg-rose-500 text-white'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          🌱 Crop Lab
        </button>
        <button
          type="button"
          onClick={() => setSubTab('kitchen')}
          className={`flex-1 py-2 px-3 rounded-lg text-base font-bold cursor-pointer transition-colors whitespace-nowrap ${
            subTab === 'kitchen'
              ? 'bg-rose-500 text-white'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          🍳 Astro-Kitchen · {mealsCookedTotal} Meals
        </button>
      </div>

      {/* ================= TAB 1: CSA CROP & ASTRONAUT NUTRITION VISUALIZER ================= */}
      {subTab === 'lab' && (
        <div className="space-y-1">
          {/* Interactive Visual Simulation Display */}
          <div className="p-2.5 rounded-2xl bg-[#090E1A] border border-rose-500/40 grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
            {/* Animated SVG Astronaut & Bento Meal Plate Visualizer */}
            <div className="lg:col-span-4 flex flex-col items-center bg-[#050914] p-2 rounded-xl border border-slate-800">
              <div className="text-base font-bold text-rose-300 mb-1">
                👩‍🚀 SPACE FOOD CHECK
              </div>
              <svg
                viewBox="0 0 240 190"
                className="w-full max-w-[160px] h-auto"
                role="img"
                aria-label="Astronaut Nutrition Visual Simulation"
              >
                {/* Health Aura Halo behind Astronaut */}
                <circle
                  cx="76"
                  cy="88"
                  r="52"
                  fill={
                    sim.inHealthyRange
                      ? 'rgba(16, 185, 129, 0.16)'
                      : sim.astronautHealthState === 'Cargo Heavy'
                      ? 'rgba(245, 158, 11, 0.16)'
                      : 'rgba(251, 113, 133, 0.15)'
                  }
                  stroke={sim.inHealthyRange ? '#10B981' : '#F59E0B'}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />

                {/* Cartoon Astronaut Body Reacting to Nutrition */}
                <rect x="46" y="76" width="60" height="58" rx="16" fill="#F8FAFC" stroke="#020617" strokeWidth="3" />
                <rect x="48" y="78" width="56" height="16" rx="8" fill={crewColor} />
                <rect x="64" y="96" width="24" height="18" rx="4" fill="#E2E8F0" stroke="#334155" strokeWidth="1.5" />
                {/* Heart / Vitamin Glow */}
                <circle
                  cx="76"
                  cy="105"
                  r={5 + (sim.vitaminCScore / 100) * 4}
                  fill={sim.vitaminCScore >= 65 ? '#10B981' : '#F59E0B'}
                />

                {/* Helmet & Expression */}
                <circle cx="76" cy="52" r="28" fill="#F8FAFC" stroke="#020617" strokeWidth="3" />
                <ellipse cx="78" cy="52" rx="19" ry="15" fill="#0F172A" />
                <ellipse cx="78" cy="53" rx="15" ry="12" fill="#FDBA74" />
                <circle cx="72" cy="50" r="2.2" fill="#0F172A" />
                <circle cx="84" cy="50" r="2.2" fill="#0F172A" />
                {sim.inHealthyRange ? (
                  <path d="M72 57c3 4 9 4 12 0" fill="none" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
                ) : (
                  <line x1="73" y1="58" x2="83" y2="58" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
                )}

                {/* Visual Space Bento Plate beside Astronaut */}
                <rect x="132" y="34" width="96" height="114" rx="14" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" />
                <text x="180" y="50" textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="monospace">
                  HYDRO-PLATE
                </text>
                {/* Show visual dots/emojis for each selected crop */}
                {CSA_HYDROPONIC_CROPS.map((crop, idx) => {
                  const qty = cropSelections[crop.id] || 0;
                  const col = idx % 2;
                  const row = Math.floor(idx / 2);
                  const bx = 140 + col * 42;
                  const by = 58 + row * 28;
                  return (
                    <g key={crop.id}>
                      <rect
                        x={bx}
                        y={by}
                        width={38}
                        height={22}
                        rx={5}
                        fill={qty > 0 ? `${crop.color}33` : '#0F172A'}
                        stroke={qty > 0 ? crop.color : '#334155'}
                        strokeWidth={1.5}
                      />
                      <text x={bx + 12} y={by + 15} textAnchor="middle" fontSize="12">
                        {crop.emoji}
                      </text>
                      <text
                        x={bx + 29}
                        y={by + 15}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        x{qty}
                      </text>
                    </g>
                  );
                })}

                {/* Status Badge at bottom of SVG */}
                <rect x="26" y="156" width="188" height="24" rx="8" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
                <text
                  x="120"
                  y="172"
                  textAnchor="middle"
                  fill={sim.inHealthyRange ? '#34D399' : '#FBBF24'}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {sim.astronautHealthState.toUpperCase()} · {sim.totalKcal} KCAL
                </text>
              </svg>
            </div>

            {/* Live Nutrition Impact Gauges */}
            <div className="lg:col-span-8 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-rose-300">
                    🌎 NASA CROP LAB
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Crop Mix
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCropSelections(DEFAULT_CROP_SELECTIONS)}
                  className="min-h-11 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-base font-semibold text-cyan-300 cursor-pointer"
                >
                  🌈 Balanced Mix
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-base font-mono">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex flex-col mb-1">
                    <span className="text-amber-300">⚡ ENERGY</span>
                    <span className="font-bold text-white tabular-nums">{sim.totalKcal} kcal</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        sim.totalKcal >= 1900 && sim.totalKcal <= 3200
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (sim.totalKcal / 3400) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex flex-col mb-1">
                    <span className="text-sky-300">💪 PROTEIN</span>
                    <span className="font-bold text-white tabular-nums">{sim.proteinGrams}g · {sim.proteinScore}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-all duration-200"
                      style={{ width: `${sim.proteinScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex flex-col mb-1">
                    <span className="text-rose-300">🍋 VITAMIN C</span>
                    <span className="font-bold text-white tabular-nums">{sim.vitaminCScore}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 transition-all duration-200"
                      style={{ width: `${sim.vitaminCScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex flex-col mb-1">
                    <span className="text-emerald-300">🦴 CREW MORALE</span>
                    <span className="font-bold text-white tabular-nums">{sim.crewMoodBoost}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-200"
                      style={{ width: `${sim.crewMoodBoost}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold text-emerald-300">
                  {sim.inHealthyRange ? '🌟 Balanced meal!' : '🥗 Try a crop mix!'}
                </p>
                <button
                  type="button"
                  onClick={() => setSubTab('kitchen')}
                  className="min-h-11 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-base cursor-pointer"
                >
                  🍳 Cook a Meal
                </button>
              </div>
            </div>
          </div>

          {/* 6 Interactive Hydroponic Crop Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CSA_HYDROPONIC_CROPS.map((crop) => {
              const qty = cropSelections[crop.id] || 0;
              return (
                <div
                  key={crop.id}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-1"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl shrink-0" aria-hidden="true">{crop.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-xl leading-tight text-white">
                          {crop.name}
                        </div>
                        <div className="text-base font-semibold" style={{ color: crop.color }}>
                          {CROP_KID_TAGS[crop.id]}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-base font-semibold text-cyan-300">
                      ⏳ {crop.growthDays} days
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Remove one ${crop.name}`}
                        onClick={() => adjustCrop(crop.id, -1)}
                        className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-2xl font-bold cursor-pointer"
                      >
                        −
                      </button>
                      <span className="font-mono font-bold text-xl text-white w-6 text-center tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${crop.name}`}
                        onClick={() => adjustCrop(crop.id, 1)}
                        className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-2xl font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: ASTRO-KITCHEN (OBTAIN -> MIX -> BAKE -> EAT TOGETHER) ================= */}
      {subTab === 'kitchen' && (
        <div className="space-y-1">
          {/* Live Ingredient Pantry Bar (Earned from Bio-Dome, Electrolyzer, EVA Ice Drill) */}
          <div className="p-2 rounded-2xl bg-[#090E1A] border border-slate-800 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-bold text-emerald-300">
                🥣 Space Pantry
              </div>
              <button
                type="button"
                disabled={foragedThisModal}
                onClick={() => {
                  setForagedThisModal(true);
                  onForageStarterSprouts();
                  spaceAudio.playBreakerClick(true);
                }}
                className="min-h-11 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-slate-950 font-bold text-base cursor-pointer whitespace-nowrap"
              >
                {foragedThisModal ? '✓ Sprouts Added' : '🌱 Gather Sprouts'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
              {pantryBadgeList.map((item) => (
                <div
                  key={item.key}
                  className="p-1 rounded-xl bg-slate-900 border border-slate-800 text-center"
                >
                  <div className="text-xl">{item.emoji}</div>
                  <div className="text-base font-semibold text-slate-300">{item.label}</div>
                  <div className="text-base font-mono font-bold text-cyan-300 tabular-nums">
                    x{pantry[item.key]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAGE 0: PICK SPACE RECIPE */}
          {cookStage === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPACE_RECIPES.map((recipe) => {
                const craftable = canCookSpaceRecipe(pantry, recipe);
                return (
                  <div
                    key={recipe.id}
                    className={`p-2 rounded-2xl border-2 flex flex-col justify-between gap-1 ${
                      craftable
                        ? 'bg-slate-900 border-rose-500/50'
                        : 'bg-slate-950 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xl font-bold text-white">
                          {recipe.emoji} {recipe.name}
                        </span>
                        <span className="text-base font-mono text-emerald-300">
                          +{recipe.rewards.food}% Food · +{recipe.rewards.science} Sci
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 text-base font-mono">
                        {Object.entries(recipe.cost).map(([k, amt]) => {
                          const key = k as keyof CropPantryInventory;
                          const badge = pantryBadgeList.find((b) => b.key === key);
                          const have = pantry[key] || 0;
                          const ok = have >= (amt || 0);
                          return (
                            <span
                              key={k}
                              className={`px-2 py-0.5 rounded border ${
                                ok
                                  ? 'bg-slate-950 border-slate-700 text-slate-200'
                                  : 'bg-rose-950/60 border-rose-500 text-rose-300'
                              }`}
                            >
                              {badge?.emoji} {amt} {badge?.label} ({have})
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!craftable}
                      onClick={() => startCookingRecipe(recipe)}
                      className="min-h-11 w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:bg-slate-800 disabled:text-slate-300 text-white font-bold text-base cursor-pointer"
                    >
                      {craftable
                        ? '🍳 Start Cooking!'
                        : '🌱 Need More Crops'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* STAGE 1: ZERO-G ASTRO-MIXER (TAP FLOATING INGREDIENTS INTO BOWL) */}
          {cookStage === 'mix' && (
            <div className="p-3 rounded-2xl bg-slate-900 border-2 border-cyan-500/60 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-cyan-300">
                    🥣 STEP 1 · MIX
                  </div>
                  <h4 className="text-xl font-bold text-white">
                    Tap ingredients ({mixerItems.filter((i) => i.collected).length}/
                    {mixerItems.length})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setCookStage('select')}
                  className="min-h-11 px-3 py-2 rounded-xl bg-slate-800 text-base text-slate-200 cursor-pointer"
                >
                  Change Dish
                </button>
              </div>

              <div className="relative h-60 rounded-2xl bg-[#050914] border border-slate-800 overflow-hidden">
                {/* Central Swirling Mixing Bowl */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-sky-950/70 border-4 border-cyan-400 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-3xl">{selectedRecipe.emoji}</span>
                  <span className="whitespace-nowrap text-xs font-mono font-bold text-cyan-200 mt-0.5">ASTRO-MIXER</span>
                </div>

                {/* Clickable Floating Ingredient Bubbles */}
                {mixerItems.map((orb) =>
                  orb.collected ? null : (
                    <button
                      key={orb.uid}
                      type="button"
                      onClick={() => collectMixerOrb(orb.uid)}
                      style={{ left: `${orb.x}%`, top: `${orb.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 min-h-11 px-3 py-2 rounded-2xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border-2 border-cyan-400/80 text-white font-bold text-base shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <span className="text-lg mr-1">{orb.emoji}</span>
                      {orb.label}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* STAGE 2: THERMAL GALLEY CONVECTION BAKE */}
          {(cookStage === 'bake' || cookStage === 'bake_failed') && (
            <div className="p-3 rounded-2xl bg-slate-900 border-2 border-amber-500/60 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-amber-300">
                    🔥 STEP 2 · BAKE
                  </div>
                  <h4 className="text-xl font-bold text-white">
                    Keep the oven in the green zone!
                  </h4>
                </div>
                <span className="font-mono font-bold text-lg text-emerald-400 tabular-nums">
                  {bakeProgress}% BAKED
                </span>
              </div>

              {/* Heat Zone Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-base font-mono">
                  <span className="text-amber-300">GALLEY OVEN TEMP: {Math.round(ovenTemp)}°</span>
                  <span
                    className={
                      ovenTemp >= 58 && ovenTemp <= 88 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                    }
                  >
                    {ovenTemp >= 58 && ovenTemp <= 88
                      ? '★ GOLDEN CRISP ZONE!'
                      : ovenTemp > 88
                      ? '🔥 TOO HOT! RELEASE HEAT!'
                      : '❄️ TOO COOL! PULSE HEAT!'}
                  </span>
                </div>
                <div className="relative h-6 rounded-full bg-slate-950 border border-slate-700 overflow-hidden">
                  {/* Golden Target Zone Marker (58% to 88%) */}
                  <div
                    className="absolute inset-y-0 bg-emerald-500/25 border-x-2 border-emerald-400"
                    style={{ left: '58%', width: '30%' }}
                  />
                  {/* Live Temp Marker */}
                  <div
                    className={`h-full transition-all duration-100 ${
                      ovenTemp > 88 ? 'bg-rose-500' : ovenTemp >= 58 ? 'bg-amber-400' : 'bg-sky-400'
                    }`}
                    style={{ width: `${ovenTemp}%` }}
                  />
                </div>

                {/* Bake Completion Progress Bar */}
                <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-150"
                    style={{ width: `${bakeProgress}%` }}
                  />
                </div>
              </div>

              {cookStage === 'bake_failed' ? (
                <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-base text-rose-100">
                    🔥 Too hot! Let the oven cool.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOvenTemp(64);
                      setBakeProgress(10);
                      setCookStage('bake');
                    }}
                    className="min-h-11 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base cursor-pointer"
                  >
                    Retry Galley Bake
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onPointerDown={() => {
                      heatingRef.current = true;
                      spaceAudio.playBreakerClick(true);
                    }}
                    onPointerUp={() => {
                      heatingRef.current = false;
                    }}
                    onPointerLeave={() => {
                      heatingRef.current = false;
                    }}
                    onClick={() => {
                      const bumped = Math.min(94, ovenTempRef.current + 12);
                      ovenTempRef.current = bumped;
                      setOvenTemp(bumped);
                    }}
                    className="min-h-12 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg cursor-pointer active:scale-95"
                  >
                    🔥 Hold / Tap Convection Heater (+Heat)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: SERVE & EAT TOGETHER AT CREW MESS TABLE */}
          {(cookStage === 'eat' || cookStage === 'done') && (
            <div className="p-3 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-bold text-emerald-300">
                    🍽️ STEP 3 · CREW FEAST
                  </div>
                  <h4 className="text-xl font-bold text-white">
                    {cookStage === 'done'
                      ? `🎉 Crew Feast! ${selectedRecipe.emoji}`
                      : `Tap plates to serve! (${fedCount}/5)`}
                  </h4>
                </div>
                {cookStage === 'done' && (
                  <button
                    type="button"
                    onClick={() => setCookStage('select')}
                    className="min-h-11 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-base cursor-pointer"
                  >
                    🍳 Cook Another Space Meal
                  </button>
                )}
              </div>

              {/* Graphical Dining Table with 5 Cute Cartoon Crewmates */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {CREW_DINERS.map((diner) => {
                  const hasEaten = Boolean(fedDiners[diner.id]) || cookStage === 'done';
                  const suit = diner.id === 'you' ? crewColor : diner.color;
                  return (
                    <button
                      key={diner.id}
                      type="button"
                      disabled={hasEaten}
                      onClick={() => serveCrewmate(diner.id)}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        hasEaten
                          ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                          : 'bg-slate-950 hover:bg-slate-800 border-amber-400/70 text-white hover:scale-[1.03]'
                      }`}
                    >
                      {/* Mini Cartoon Astronaut SVG Avatar */}
                      <svg viewBox="0 0 64 64" className="w-12 h-12" aria-hidden="true">
                        <circle cx="32" cy="26" r="18" fill="#F8FAFC" stroke="#020617" strokeWidth="2.5" />
                        <rect x="20" y="40" width="24" height="18" rx="7" fill={suit} stroke="#020617" strokeWidth="2.2" />
                        <ellipse cx="33" cy="26" rx="12" ry="9.5" fill="#0F172A" />
                        <ellipse cx="33" cy="26.5" rx="9.5" ry="7.5" fill="#FDBA74" />
                        <circle cx="29.5" cy="25" r="1.5" fill="#0F172A" />
                        <circle cx="36.5" cy="25" r="1.5" fill="#0F172A" />
                        {hasEaten ? (
                          <path d="M29 29.5c2 3 6 3 8 0" fill="none" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />
                        ) : (
                          <circle cx="33" cy="30" r="1.8" fill="#7C2D12" />
                        )}
                      </svg>
                      <span className="text-base font-bold truncate w-full">
                        {diner.id === 'you' ? playerDinerName : diner.name}
                      </span>
                      <span className="text-lg">
                        {hasEaten ? `${selectedRecipe.emoji} 😋` : '🍽️'}
                      </span>
                      <span className="text-base font-semibold text-amber-200">
                        {hasEaten ? '😋 Served!' : 'Tap to serve'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {cookStage === 'done' && (
                <div className="p-3 rounded-xl bg-emerald-950/75 border border-emerald-500/50 text-base font-mono text-emerald-100 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    ✓ CREW FED (+{selectedRecipe.rewards.food}% Food, +{selectedRecipe.rewards.oxygen}%
                    O2 Morale, +{selectedRecipe.rewards.science} Science)
                  </span>
                  <span>CREW LOUNGE PARTY ACTIVE!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
