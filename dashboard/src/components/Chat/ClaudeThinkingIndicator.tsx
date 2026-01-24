/**
 * ClaudeThinkingIndicator
 *
 * A premium, animated thinking indicator that shows Claude is working.
 * Features:
 * - Alternating clawd images (focus/vibing) every 3 seconds
 * - Funny action words with typing animation
 * - Synchronized image and word changes
 * - Optional stop button
 */

import { useState, useEffect, useCallback, memo } from "react";

// Funny action words - inspired by Claude Code CLI
const ACTION_WORDS = [
  "Pontificating",
  "Clauding",
  "Building",
  "Thinking",
  "Contemplating",
  "Scheming",
  "Computing",
  "Conjuring",
  "Manifesting",
  "Synthesizing",
  "Orchestrating",
  "Architecting",
  "Materializing",
  "Visualizing",
  "Calculating",
  "Formulating",
  "Analyzing",
  "Processing",
  "Cogitating",
  "Ruminating",
  "Deliberating",
  "Musing",
  "Pondering",
  "Brainstorming",
  "Innovating",
  "Engineering",
  "Crafting",
  "Designing",
  "Structuring",
  "Assembling",
  "Composing",
  "Devising",
  "Hatching",
  "Brewing",
  "Concocting",
  "Whipping up",
  "Cooking up",
  "Dreaming up",
  "Spinning up",
  "Firing up",
];

// Image paths
const CLAWD_FOCUS = "/clawd_focus.png";
const CLAWD_VIBING = "/clawd_vibing.png";

// Animation timing
const CYCLE_DURATION = 3000; // 3 seconds per cycle
const TYPING_SPEED = 50; // ms per character
const DOT_ANIMATION_DELAY = 200; // ms between dots appearing

interface ClaudeThinkingIndicatorProps {
  /** Show "Sending..." instead of action words */
  isSending?: boolean;
  /** Callback when stop button is clicked */
  onStop?: () => void;
  /** Show the stop button */
  showStopButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ClaudeThinkingIndicator = memo(function ClaudeThinkingIndicator({
  isSending = false,
  onStop,
  showStopButton = false,
  className = "",
}: ClaudeThinkingIndicatorProps) {
  // Current image (alternates between focus and vibing)
  const [imageIndex, setImageIndex] = useState(0);

  // Current action word index
  const [wordIndex, setWordIndex] = useState(() =>
    Math.floor(Math.random() * ACTION_WORDS.length)
  );

  // Typing animation state
  const [displayedText, setDisplayedText] = useState("");
  const [dotsCount, setDotsCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  // Get current values
  const currentImage = imageIndex === 0 ? CLAWD_FOCUS : CLAWD_VIBING;
  const currentWord = isSending ? "Sending" : ACTION_WORDS[wordIndex];

  // Typing animation effect
  useEffect(() => {
    if (isTyping) {
      // Type out the word character by character
      if (displayedText.length < currentWord.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentWord.slice(0, displayedText.length + 1));
        }, TYPING_SPEED);
        return () => clearTimeout(timeout);
      } else {
        // Word is fully typed, start showing dots
        setIsTyping(false);
        setDotsCount(0);
      }
    } else {
      // Animate the dots (up to 3)
      if (dotsCount < 3) {
        const timeout = setTimeout(() => {
          setDotsCount((prev) => prev + 1);
        }, DOT_ANIMATION_DELAY);
        return () => clearTimeout(timeout);
      }
    }
  }, [displayedText, dotsCount, isTyping, currentWord]);

  // Cycle animation - switch image and word every CYCLE_DURATION
  useEffect(() => {
    if (isSending) return; // Don't cycle when sending

    const interval = setInterval(() => {
      // Switch image
      setImageIndex((prev) => (prev + 1) % 2);

      // Pick a new random word (different from current)
      setWordIndex((prev) => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * ACTION_WORDS.length);
        } while (newIndex === prev && ACTION_WORDS.length > 1);
        return newIndex;
      });

      // Reset typing animation
      setDisplayedText("");
      setDotsCount(0);
      setIsTyping(true);
    }, CYCLE_DURATION);

    return () => clearInterval(interval);
  }, [isSending]);

  // Reset when word changes
  useEffect(() => {
    setDisplayedText("");
    setDotsCount(0);
    setIsTyping(true);
  }, [currentWord]);

  // Handle stop click
  const handleStopClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStop?.();
    },
    [onStop]
  );

  // Generate dots string
  const dots = ".".repeat(dotsCount);

  return (
    <div className={`flex flex-col gap-2 max-w-[85%] mr-auto items-start ${className}`}>
      {/* Claude label */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <span className="font-medium">Claude</span>
      </div>

      {/* Main indicator container with premium glow */}
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3 glass border border-[var(--border-subtle)] shadow-[0_0_30px_var(--accent-primary-glow)] animate-thinking-glow">
        {/* Animated Clawd image */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <img
            src={currentImage}
            alt="Claude thinking"
            className="w-8 h-8 object-contain transition-opacity duration-300 animate-clawd-bounce"
          />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-[var(--accent-primary)]/10 animate-pulse pointer-events-none" />
        </div>

        {/* Typing text */}
        <div className="flex items-baseline min-w-[120px]">
          <span className="text-sm text-[var(--text-secondary)] font-medium">
            {displayedText}
          </span>
          <span className="text-sm text-[var(--text-tertiary)] transition-opacity duration-150">
            {dots}
          </span>
          {/* Blinking cursor while typing */}
          {isTyping && (
            <span className="w-0.5 h-4 bg-[var(--accent-primary)] ml-0.5 animate-cursor-blink" />
          )}
        </div>

        {/* Stop button */}
        {showStopButton && onStop && (
          <button
            onClick={handleStopClick}
            className="ml-2 px-3 py-1 text-xs font-medium rounded-lg bg-[var(--accent-rose)]/20 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/40 border border-[var(--accent-rose)]/30 transition-colors flex items-center gap-1.5"
            title="Stop Claude"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop
          </button>
        )}
      </div>
    </div>
  );
});

export default ClaudeThinkingIndicator;
