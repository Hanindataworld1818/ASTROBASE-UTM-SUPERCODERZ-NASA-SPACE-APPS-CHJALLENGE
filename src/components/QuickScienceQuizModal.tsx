import React, { useState } from 'react';

interface QuickScienceQuizModalProps {
  onClose: () => void;
  onCorrectAnswer: () => void;
}

const QUICK_QUIZ_QUESTIONS = [
  {
    question: 'What gives plants the energy to grow in a space greenhouse?',
    choices: ['Moon rocks', 'Sunlight or grow lights', 'Astronaut snacks'],
    correctIndex: 1,
  },
  {
    question: 'How much weaker is gravity on the Moon than on Earth?',
    choices: ['About 6 times weaker', 'Exactly the same', 'About 100 times weaker'],
    correctIndex: 0,
  },
  {
    question: 'What does a rover help astronauts explore?',
    choices: ['The ocean floor', 'Another planet or moon', 'The inside of the Sun'],
    correctIndex: 1,
  },
  {
    question: 'What gas do astronauts need to breathe?',
    choices: ['Oxygen', 'Helium', 'Carbon dioxide'],
    correctIndex: 0,
  },
];

export const QuickScienceQuizModal: React.FC<QuickScienceQuizModalProps> = ({
  onClose,
  onCorrectAnswer,
}) => {
  const [question] = useState(
    () => QUICK_QUIZ_QUESTIONS[Math.floor(Math.random() * QUICK_QUIZ_QUESTIONS.length)]
  );
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  const answerQuestion = (choiceIndex: number) => {
    if (result !== null) return;
    if (choiceIndex === question.correctIndex) {
      setResult('correct');
      onCorrectAnswer();
    } else {
      setResult('incorrect');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-quiz-title"
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-amber-400/80 bg-[#090E1A] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              🚀 QUICK SPACE QUIZ · +50 MC
            </div>
            <h2 id="quick-quiz-title" className="mt-1 text-xl font-extrabold text-white">
              Mission Brain Boost!
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick quiz"
            className="rounded-lg px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <p className="mt-5 text-lg font-bold leading-snug text-white">{question.question}</p>
        <div className="mt-4 grid gap-2">
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              type="button"
              disabled={result !== null}
              onClick={() => answerQuestion(index)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:bg-cyan-950/50 disabled:cursor-default disabled:opacity-70"
            >
              <span className="mr-2 text-cyan-300">{String.fromCharCode(65 + index)}.</span>
              {choice}
            </button>
          ))}
        </div>

        {result && (
          <div
            role="status"
            className={`mt-4 rounded-xl border p-3 text-sm font-bold ${
              result === 'correct'
                ? 'border-emerald-400/70 bg-emerald-950/60 text-emerald-200'
                : 'border-amber-400/70 bg-amber-950/40 text-amber-100'
            }`}
          >
            {result === 'correct'
              ? '🌟 Brilliant! +50 Mission Credits added!'
              : 'Almost! Try another answer.'}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          {result === 'correct' ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-400 px-5 py-2.5 font-extrabold text-slate-950 hover:bg-emerald-300"
            >
              Back to mission
            </button>
          ) : result === 'incorrect' ? (
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-xl bg-amber-400 px-5 py-2.5 font-extrabold text-slate-950 hover:bg-amber-300"
            >
              Try again
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-5 py-2.5 font-bold text-slate-300 hover:bg-slate-800"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
