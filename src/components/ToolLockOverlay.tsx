import React from 'react';

interface ToolLockOverlayProps {
  requiredTool: string;
  onOpenQuickQuiz?: () => void;
  onOpenShop?: () => void;
}

export const ToolLockOverlay: React.FC<ToolLockOverlayProps> = ({
  requiredTool,
  onOpenQuickQuiz,
  onOpenShop,
}) => (
  <div
    role="region"
    aria-label={`Task locked: ${requiredTool} required`}
    className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-slate-400/55 p-4 backdrop-blur-[2px]"
  >
    <div className="w-full max-w-lg rounded-2xl border-2 border-slate-200/80 bg-slate-800/90 p-5 text-center shadow-2xl sm:p-7">
      <div className="text-6xl" aria-hidden="true">🔒</div>
      <h3 className="mt-3 text-lg font-extrabold leading-snug text-white sm:text-xl">
        🔒 TOOL REQUIRED: Answer Quiz &amp; Buy in Shop!
      </h3>
      <p className="mt-2 text-base text-slate-200">
        Unlock {requiredTool} in the NASA Tech Shop to play this task.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {onOpenQuickQuiz && (
          <button
            type="button"
            onClick={onOpenQuickQuiz}
            className="rounded-xl bg-amber-400 px-4 py-3 font-extrabold text-slate-950 shadow-lg hover:bg-amber-300"
          >
            🧠 Quick Quiz +50 MC
          </button>
        )}
        {onOpenShop && (
          <button
            type="button"
            onClick={onOpenShop}
            className="rounded-xl border-2 border-cyan-300 bg-cyan-500 px-4 py-3 font-extrabold text-slate-950 shadow-lg hover:bg-cyan-300"
          >
            🎒 Buy in Tech Shop
          </button>
        )}
      </div>
    </div>
  </div>
);
