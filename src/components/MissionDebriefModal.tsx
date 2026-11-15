import React from 'react';
import { MissionDebriefAlert } from '../game/rules';

interface MissionDebriefModalProps {
  alert: MissionDebriefAlert;
  onClose: () => void;
  onOpenShop?: () => void;
}

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  alert,
  onClose,
  onOpenShop,
}) => {
  const isCritical = alert.severity === 'critical';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        className={`relative w-full max-w-2xl rounded-3xl bg-[#090E1A] border-2 shadow-2xl overflow-hidden flex flex-col ${
          isCritical ? 'border-rose-500 shadow-rose-950/50' : 'border-amber-400 shadow-amber-950/50'
        }`}
      >
        {/* Header with Alert Banner */}
        <div
          className={`p-5 sm:p-6 border-b flex items-start gap-4 ${
            isCritical
              ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-900/60'
              : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-900/60'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0 ${
              isCritical ? 'bg-rose-500/20 border-2 border-rose-400' : 'bg-amber-500/20 border-2 border-amber-400'
            }`}
          >
            {alert.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isCritical
                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}
              >
                {isCritical ? 'CRITICAL MISSION ALERT' : 'TRADE-OFF CONSEQUENCE DEBRIEF'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">NASA FLIGHT LOG</span>
            </div>

            <h2 id="debrief-title" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              {alert.title}
            </h2>
          </div>
        </div>

        {/* 3 Step Consequence Feedback Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* 1. CAUSE */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>1. WHAT HAPPENED (YOUR ENGINEERING TRADE-OFF)</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {alert.cause}
            </p>
          </div>

          {/* 2. REAL NASA CONSEQUENCE */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>2. REAL NASA CONSEQUENCE IN SPACE</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {alert.nasaConsequence}
            </p>
          </div>

          {/* 3. KID-FRIENDLY LESSON */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>3. JUNIOR ASTRONAUT LESSON</span>
            </div>
            <p className="text-sm text-cyan-100 leading-relaxed">
              {alert.kidLesson}
            </p>
          </div>

          {/* 4. RECOMMENDED ACTION */}
          {alert.recommendedAction && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-xs">
              <span className="text-base shrink-0">🛠️</span>
              <div>
                <span className="font-bold text-slate-300 font-mono">RECOMMENDED FIX: </span>
                <span className="text-slate-300">{alert.recommendedAction}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            Every decision has real trade-offs · Life support &amp; shields always come first
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenShop && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShop();
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-colors flex items-center gap-1.5"
              >
                <span>🎒</span>
                <span>Open NASA Tech Shop</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-lg transition-colors ${
                isCritical
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              Acknowledge &amp; Continue Mission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
