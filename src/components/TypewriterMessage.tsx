import React, { useEffect, useState } from 'react';
import { soundFX } from '../services/sound';
import { DialogueEntry } from '../types/game';

interface TypewriterMessageProps {
  entry: DialogueEntry;
  isLatestMessage: boolean;
  soundEnabled: boolean;
  onTypingProgress?: () => void;
}

export const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  entry,
  isLatestMessage,
  soundEnabled,
  onTypingProgress,
}) => {
  const shouldAnimate = (entry.speaker === 'NPC' || entry.speaker === 'SYSTEM') && isLatestMessage;
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

    // Initial "is typing..." pause before characters appear
    const startTimer = setTimeout(() => {
      setIsPreTyping(false);
    }, 350);

    return () => clearTimeout(startTimer);
  }, [entry.id, entry.text, shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate || isPreTyping) return;
    if (displayedChars >= entry.text.length) return;

    const currentChar = entry.text[displayedChars] || '';
    const isPunctuation = ['.', '!', '?', ',', ';', ':'].includes(currentChar);
    const delay = isPunctuation ? 95 : 28;

    const stepTimer = setTimeout(() => {
      const nextCount = Math.min(entry.text.length, displayedChars + 1);
      setDisplayedChars(nextCount);
      if (nextCount % 5 === 0) {
        soundFX.playBeep(620, 0.015, 'square', soundEnabled);
      }
      onTypingProgress?.();
    }, delay);

    return () => clearTimeout(stepTimer);
  }, [displayedChars, entry.text, isPreTyping, onTypingProgress, shouldAnimate, soundEnabled]);

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
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200 cursor-pointer'
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
          <span className="text-slate-400 italic">Writing...</span>
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

interface TypewriterLogEntryProps {
  text: string;
  shouldAnimate: boolean;
  soundEnabled: boolean;
  isHighlighted?: boolean;
}

/**
 * Renders narrative log entries (where hours pass and events are explained)
 * with a live typewriter timer so the player can read what happened step by step.
 */
export const TypewriterLogEntry: React.FC<TypewriterLogEntryProps> = ({
  text,
  shouldAnimate,
  soundEnabled,
  isHighlighted = false,
}) => {
  const [displayedChars, setDisplayedChars] = useState<number>(
    shouldAnimate ? 0 : text.length
  );
  const [isPreTyping, setIsPreTyping] = useState<boolean>(shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setIsPreTyping(false);
      setDisplayedChars(text.length);
      return;
    }

    setIsPreTyping(true);
    setDisplayedChars(0);

    const startTimer = setTimeout(() => {
      setIsPreTyping(false);
    }, 240);

    return () => clearTimeout(startTimer);
  }, [text, shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate || isPreTyping) return;
    if (displayedChars >= text.length) return;

    const currentChar = text[displayedChars] || '';
    const isPunctuation = ['.', '!', '?', ',', ';', ':'].includes(currentChar);
    const delay = isPunctuation ? 85 : 26;

    const stepTimer = setTimeout(() => {
      const nextCount = Math.min(text.length, displayedChars + 1);
      setDisplayedChars(nextCount);
      if (nextCount % 6 === 0) {
        soundFX.playBeep(540, 0.012, 'square', soundEnabled);
      }
    }, delay);

    return () => clearTimeout(stepTimer);
  }, [displayedChars, isPreTyping, shouldAnimate, soundEnabled, text]);

  const isStillTyping = shouldAnimate && (isPreTyping || displayedChars < text.length);

  return (
    <div
      onClick={() => {
        if (isStillTyping) {
          setIsPreTyping(false);
          setDisplayedChars(text.length);
        }
      }}
      className={`py-2 px-3 rounded-lg border leading-relaxed break-words transition-colors ${
        isHighlighted
          ? 'bg-slate-900/95 border-amber-500/40 text-amber-100 cursor-pointer shadow-xs'
          : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
      }`}
      title={isStillTyping ? 'Click to finish typing immediately' : undefined}
    >
      {isHighlighted && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-amber-400/90 font-semibold mb-0.5">
          <span>
            LATEST EVENT LOG
            {isStillTyping && (
              <span className="ml-2 text-emerald-400 font-normal italic">
                is typing...
              </span>
            )}
          </span>
          {isStillTyping && <span className="text-slate-500">[Click to skip]</span>}
        </div>
      )}

      {isPreTyping ? (
        <div className="py-0.5 flex items-center gap-1.5 text-amber-400 font-mono text-xs">
          <span>▋</span>
          <span className="text-slate-400 italic">Logging event...</span>
        </div>
      ) : (
        <div className="text-xs sm:text-[13px]">
          {text.slice(0, displayedChars)}
          {displayedChars < text.length && (
            <span className="inline-block ml-0.5 text-amber-400">▋</span>
          )}
        </div>
      )}
    </div>
  );
};
