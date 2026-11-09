import React, { useEffect, useState } from 'react';
import { soundFX } from '../services/sound';
import { DialogueEntry } from '../types/game';

interface TypewriterMessageProps {
  entry: DialogueEntry;
  isLatestNpcMessage: boolean;
  soundEnabled: boolean;
  onTypingProgress?: () => void;
}

export const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  entry,
  isLatestNpcMessage,
  soundEnabled,
  onTypingProgress,
}) => {
  const shouldAnimate = entry.speaker === 'NPC' && isLatestNpcMessage;
  const [displayedChars, setDisplayedChars] = useState<number>(
    shouldAnimate ? 0 : entry.text.length
  );
  const [isPreTyping, setIsPreTyping] = useState<boolean>(shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setIsPreTyping(false);
      setDisplayedChars(entry.text.length);
      return;
    }

    setIsPreTyping(true);
    setDisplayedChars(0);

    // Initial "is typing..." pause (320ms) before characters appear
    const startTimer = setTimeout(() => {
      setIsPreTyping(false);
    }, 320);

    return () => clearTimeout(startTimer);
  }, [entry.id, entry.text, shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate || isPreTyping) return;
    if (displayedChars >= entry.text.length) return;

    const stepTimer = setTimeout(() => {
      const nextCount = Math.min(entry.text.length, displayedChars + 2);
      setDisplayedChars(nextCount);
      if (nextCount % 8 === 0) {
        soundFX.playBeep(620, 0.015, 'square', soundEnabled);
      }
      onTypingProgress?.();
    }, 22);

    return () => clearTimeout(stepTimer);
  }, [displayedChars, entry.text.length, isPreTyping, onTypingProgress, shouldAnimate, soundEnabled]);

  const isStillTyping = shouldAnimate && (isPreTyping || displayedChars < entry.text.length);

  return (
    <div
      onClick={() => {
        if (isStillTyping) {
          setIsPreTyping(false);
          setDisplayedChars(entry.text.length);
        }
      }}
      className={`p-3 rounded-lg border transition-colors ${
        entry.speaker === 'PLAYER'
          ? 'bg-amber-950/25 border-amber-500/30 text-amber-200 ml-3 sm:ml-6'
          : entry.speaker === 'SYSTEM'
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          : 'bg-slate-900/90 border-slate-800 text-slate-100 mr-3 sm:mr-6 cursor-pointer'
      }`}
      title={isStillTyping ? 'Click to reveal full message immediately' : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
        <span className="font-bold text-slate-200 break-words">
          {entry.speakerName}
          {isStillTyping && (
            <span className="ml-2 text-amber-400 font-normal italic">
              is typing...
            </span>
          )}
        </span>
        <span>{entry.timestamp}</span>
      </div>

      {isPreTyping ? (
        <div className="py-1 flex items-center gap-1.5 text-amber-400 font-mono text-xs">
          <span>▋</span>
          <span className="text-slate-400 italic">Thinking...</span>
        </div>
      ) : (
        <p className="leading-relaxed text-xs sm:text-sm break-words">
          {entry.text.slice(0, displayedChars)}
          {displayedChars < entry.text.length && (
            <span className="inline-block ml-0.5 text-amber-400">▋</span>
          )}
        </p>
      )}

      {!isStillTyping && entry.mathDebug && (
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-[11px] text-sky-400 break-words">
          [Engine Telemetry] {entry.mathDebug}
        </div>
      )}
    </div>
  );
};
