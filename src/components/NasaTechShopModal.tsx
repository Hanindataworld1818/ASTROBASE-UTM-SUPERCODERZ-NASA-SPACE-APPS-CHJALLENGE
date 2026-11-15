import React, { useState } from 'react';
import {
  NASA_TECH_TOOLS,
  NasaTechTool,
  NasaTechToolId,
} from '../game/rules';
import { spaceAudio } from '../game/audio';

interface NasaTechShopModalProps {
  missionCredits: number;
  unlockedTools: NasaTechToolId[];
  equippedTools: {
    eva: NasaTechToolId;
    lifesupport: NasaTechToolId | '';
    hydroponics: NasaTechToolId | '';
  };
  onClose: () => void;
  onBuyTool: (toolId: NasaTechToolId) => void;
  onEquipTool: (bay: 'eva' | 'lifesupport' | 'hydroponics', toolId: NasaTechToolId) => void;
  onOpenQuickQuiz?: () => void;
}

export const NasaTechShopModal: React.FC<NasaTechShopModalProps> = ({
  missionCredits,
  unlockedTools,
  equippedTools,
  onClose,
  onBuyTool,
  onEquipTool,
  onOpenQuickQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'backpack'>('shop');
  const [selectedToolId, setSelectedToolId] = useState<NasaTechToolId>('eds');

  const toolsList: NasaTechTool[] = Object.values(NASA_TECH_TOOLS);
  const selectedTool = NASA_TECH_TOOLS[selectedToolId];

  const handleBuy = (tool: NasaTechTool) => {
    if (missionCredits < tool.cost || unlockedTools.includes(tool.id)) return;
    spaceAudio.playTaskComplete();
    onBuyTool(tool.id);
  };

  const handleEquip = (tool: NasaTechTool) => {
    if (!unlockedTools.includes(tool.id)) return;
    spaceAudio.playBreakerClick(true);
    onEquipTool(tool.targetBay, tool.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-shop-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#090E1A] border-2 border-cyan-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-amber-950/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🎒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                  NASA ENGINEERING LOADOUT
                </span>
                <span className="text-[10px] font-mono text-slate-400">AGES 7–12</span>
              </div>
              <h2 id="tech-shop-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                NASA Tech Shop &amp; Tool Backpack
              </h2>
            </div>
          </div>

          {/* Player Currency Pill & Close Button */}
          <div className="flex items-center gap-3">
            <div
              data-testid="shop-mission-credits-display"
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/15 border-2 border-amber-400/80 text-amber-200 shadow-lg"
            >
              <span className="text-xl" aria-hidden="true">🪙</span>
              <div>
                <div className="text-[9px] font-mono font-bold uppercase text-amber-300">MISSION CREDITS</div>
                <div className="text-lg font-bold font-mono text-white tabular-nums leading-none">
                  {missionCredits} <span className="text-xs text-amber-300">MC</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Shop Modal"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info Banner: How to earn MC */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-base">🎓</span>
            <span>
              <strong className="text-amber-300">Earn +50 MC</strong> for each correct answer in a quick NASA science quiz.
            </span>
          </div>
          {onOpenQuickQuiz && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQuickQuiz();
              }}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              Quick Quiz +50 MC →
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-1 flex gap-2 border-b border-slate-800 bg-[#070B14]">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'shop'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🛒</span>
            <span>NASA Tech Catalog ({toolsList.length} Tools)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backpack')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backpack'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎒</span>
            <span>My Backpack Loadout ({unlockedTools.length} Owned)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'shop' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Tool List Cards */}
              <div className="md:col-span-7 space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  SELECT A TOOL TO INSPECT NASA SPECS:
                </div>

                {toolsList.map((tool) => {
                  const isOwned = unlockedTools.includes(tool.id);
                  const isEquipped =
                    equippedTools[tool.targetBay] === tool.id ||
                    (tool.isPassive && isOwned);
                  const isSelected = selectedToolId === tool.id;

                  return (
                    <div
                      key={tool.id}
                      onClick={() => setSelectedToolId(tool.id)}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-400 shadow-xl'
                          : isOwned
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                            isEquipped
                              ? 'bg-emerald-500/20 border border-emerald-400'
                              : isOwned
                              ? 'bg-cyan-500/20 border border-cyan-500/40'
                              : 'bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {tool.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{tool.name}</span>
                            {tool.isPassive && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                PASSIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400 mt-0.5 truncate">
                            {tool.targetBayLabel}
                          </div>
                          <div className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                            {tool.kidDescription}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isEquipped ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold font-mono">
                            ✓ ACTIVE
                          </span>
                        ) : isOwned ? (
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-xs font-bold font-mono">
                            OWNED
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 font-mono font-bold text-amber-300 text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                            <span>🪙</span>
                            <span>{tool.cost} MC</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Detailed Tool Inspector */}
              <div className="md:col-span-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border-2 border-slate-800 space-y-4 sticky top-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                        {selectedTool.emoji}
                      </span>
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                          {selectedTool.scienceTag}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                          {selectedTool.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Target Bay Tag */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">ASSIGNED BAY:</span>
                    <span className="text-cyan-300 font-bold">{selectedTool.targetBayLabel}</span>
                  </div>

                  {/* Kid-Friendly Effect */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono font-bold text-amber-300">
                      ⚡ WHAT IT DOES IN MISSION:
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      {selectedTool.effectDescription}
                    </p>
                  </div>

                  {/* Astronaut Hardship & Authenticity Note */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono font-bold text-emerald-300">
                      🚀 REAL NASA SCIENCE FACT:
                    </div>
                    <p className="text-xs text-slate-300 italic leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      “{selectedTool.authenticityFact}”
                    </p>
                  </div>

                  {/* Action Buttons: Buy or Equip */}
                  <div className="pt-2">
                    {unlockedTools.includes(selectedTool.id) ? (
                      selectedTool.isPassive ? (
                        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-center font-mono text-xs font-bold text-emerald-300">
                          ✓ Passive Upgrade Active! (Automatic in O2 Bay)
                        </div>
                      ) : equippedTools[selectedTool.targetBay] === selectedTool.id ? (
                        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-center font-mono text-xs font-bold text-emerald-300">
                          ✓ Currently Equipped in {selectedTool.targetBayLabel}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEquip(selectedTool)}
                          className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm shadow-lg cursor-pointer transition-all"
                        >
                          Equip in {selectedTool.targetBayLabel}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={missionCredits < selectedTool.cost}
                        onClick={() => handleBuy(selectedTool)}
                        className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 ${
                          missionCredits >= selectedTool.cost
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <span>Buy {selectedTool.shortName}</span>
                        <span>(🪙 {selectedTool.cost} MC)</span>
                      </button>
                    )}

                    {missionCredits < selectedTool.cost && !unlockedTools.includes(selectedTool.id) && (
                      <div className="text-[11px] font-mono text-center text-rose-300 mt-2">
                        Need {selectedTool.cost - missionCredits} more MC · Answer NASA quizzes in Academy Station!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* BACKPACK LOADOUT VIEW */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-xs font-mono font-bold text-cyan-300">
                  MISSION LOADOUT BY WORKSTATION BAY
                </div>
                <p className="text-xs text-slate-300">
                  Select which authentic NASA engineering tools your junior astronaut carries into each room.
                  Higher-tier tools make maintenance faster, safer, and conserve precious life-support resources!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Rover & EVA Airlock */}
                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-orange-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-orange-400">1. ROVER &amp; EVA AIRLOCK</span>
                    <span className="text-xs text-slate-400">Exterior</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-mono">CURRENTLY EQUIPPED:</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{NASA_TECH_TOOLS[equippedTools.eva].emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {NASA_TECH_TOOLS[equippedTools.eva].name}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-300">
                          {equippedTools.eva === 'eds' ? '⚡ 3x Speed · Low O2 Drain' : '⚠️ Heavy Effort · High O2 Strain'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-slate-400">CHOOSE TOOL FOR EVA:</div>
                    {(['brush', 'eds'] as const).map((id) => {
                      const t = NASA_TECH_TOOLS[id];
                      const owned = unlockedTools.includes(id);
                      const isEquipped = equippedTools.eva === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!owned}
                          onClick={() => handleEquip(t)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-orange-500/20 border-orange-400 text-orange-200'
                              : owned
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{t.emoji}</span>
                            <span>{t.shortName}</span>
                          </span>
                          <span>{isEquipped ? '✓ Active' : owned ? 'Equip' : `Lock (${t.cost} MC)`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. O2 Electrolyzer Bay */}
                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-sky-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-400">2. O2 ELECTROLYZER BAY</span>
                    <span className="text-xs text-slate-400">ECLSS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-mono">ACTIVE TECH:</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {equippedTools.lifesupport === 'pco_beam' ? '🔬' : '💡'}
                        </span>
                        <div className="text-xs font-bold text-white">
                          {equippedTools.lifesupport === 'pco_beam'
                            ? 'PCO UV-C Purifier Beam (Equipped)'
                            : 'Standard Purifier Lamp'}
                        </div>
                      </div>
                      {unlockedTools.includes('zeolite_sieve') && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-purple-300 bg-purple-950/40 p-1.5 rounded-lg border border-purple-800/60">
                          <span>🛡️</span>
                          <span>Zeolite Sieve Active (-40% CO2 rise)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-slate-400">AVAILABLE UPGRADES:</div>
                    {(['pco_beam', 'zeolite_sieve'] as const).map((id) => {
                      const t = NASA_TECH_TOOLS[id];
                      const owned = unlockedTools.includes(id);
                      const isEquipped = equippedTools.lifesupport === id || (t.isPassive && owned);

                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!owned}
                          onClick={() => handleEquip(t)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                              : owned
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{t.emoji}</span>
                            <span>{t.shortName}</span>
                          </span>
                          <span>{isEquipped ? '✓ Active' : owned ? 'Equip' : `Lock (${t.cost} MC)`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Hydroponic Bio-Dome */}
                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">3. HYDROPONIC BIO-DOME</span>
                    <span className="text-xs text-slate-400">NASA OSDR</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-mono">SENSOR CALIBRATION:</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {equippedTools.hydroponics === 'par_sensor' ? '🌱' : '👁️'}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {equippedTools.hydroponics === 'par_sensor'
                            ? 'PAR Quantum Sensor (Active)'
                            : 'Manual Visual Eye Tuning'}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-300">
                          {equippedTools.hydroponics === 'par_sensor'
                            ? 'Auto-Locks 65%–88% Red/Blue Sweet Spot'
                            : 'Manual slider calibration'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-slate-400">SENSOR SUITE:</div>
                    {(['par_sensor'] as const).map((id) => {
                      const t = NASA_TECH_TOOLS[id];
                      const owned = unlockedTools.includes(id);
                      const isEquipped = equippedTools.hydroponics === id;

                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!owned}
                          onClick={() => handleEquip(t)}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : owned
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{t.emoji}</span>
                            <span>{t.shortName}</span>
                          </span>
                          <span>{isEquipped ? '✓ Active' : owned ? 'Equip' : `Lock (${t.cost} MC)`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            NASA SPACE APPS 2026 · AUTHENTIC LIFE SUPPORT &amp; EVA TOOLS
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Close Backpack
          </button>
        </div>
      </div>
    </div>
  );
};
