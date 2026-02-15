/**
 * Lucidian mascot — a cute crystalline spirit in obsidian purple.
 *
 * States:
 * - idle: eyes open, gentle breathing animation
 * - thinking: eyes half-closed, pulsing glow
 * - working: eyes animated, crystal facets rotating
 * - done: eyes sparkle, brief celebration
 *
 * Used as: sidebar icon (static), chat welcome (animated), streaming indicator
 */

/**
 * Sidebar/ribbon icon SVG (16x16 viewBox, single path for Obsidian's addIcon).
 * A simplified crystal/gem face — two eyes on an octagonal gem shape.
 */
export const LUCIDIAN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><path d="M50 8L78 22V58L50 92L22 58V22L50 8Z" fill="currentColor" opacity="0.15"/><path d="M50 8L78 22V58L50 92L22 58V22L50 8Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round" fill="none"/><path d="M50 8L50 92M22 22L78 58M78 22L22 58" stroke="currentColor" stroke-width="1.5" opacity="0.3"/><circle cx="38" cy="40" r="5" fill="currentColor"/><circle cx="62" cy="40" r="5" fill="currentColor"/><path d="M40 56Q50 64 60 56" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;

/**
 * Chat welcome mascot — larger, more detailed, with animation hooks.
 * Returns an HTML string with CSS classes for animation states.
 */
export function createMascotElement(size = 80): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'lucidian-mascot';
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;

  container.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" class="lucidian-mascot-svg">
      <!-- Crystal body -->
      <defs>
        <linearGradient id="lucidian-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#9B8EC4;stop-opacity:0.9"/>
          <stop offset="50%" style="stop-color:#7C5CFC;stop-opacity:0.85"/>
          <stop offset="100%" style="stop-color:#6A4BC9;stop-opacity:0.95"/>
        </linearGradient>
        <filter id="lucidian-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Outer glow (animated) -->
      <path class="lucidian-glow-ring" d="M50 6L80 21V59L50 94L20 59V21L50 6Z"
        fill="none" stroke="#7C5CFC" stroke-width="2" opacity="0.3" filter="url(#lucidian-glow)"/>

      <!-- Crystal body -->
      <path class="lucidian-body" d="M50 10L76 23V57L50 90L24 57V23L50 10Z"
        fill="url(#lucidian-grad)" stroke="#6A4BC9" stroke-width="2" stroke-linejoin="round"/>

      <!-- Inner facets -->
      <path class="lucidian-facets" d="M50 10L50 90M24 23L76 57M76 23L24 57"
        stroke="white" stroke-width="1" opacity="0.15"/>

      <!-- Highlight -->
      <path d="M50 10L76 23L50 36L24 23Z" fill="white" opacity="0.12"/>

      <!-- Eyes group (animatable) -->
      <g class="lucidian-eyes">
        <!-- Left eye -->
        <ellipse class="lucidian-eye-left" cx="38" cy="42" rx="5.5" ry="6" fill="white"/>
        <circle class="lucidian-pupil-left" cx="39" cy="42" r="3" fill="#2D1B4E"/>
        <circle cx="37" cy="40" r="1.2" fill="white" opacity="0.9"/>

        <!-- Right eye -->
        <ellipse class="lucidian-eye-right" cx="62" cy="42" rx="5.5" ry="6" fill="white"/>
        <circle class="lucidian-pupil-right" cx="63" cy="42" r="3" fill="#2D1B4E"/>
        <circle cx="61" cy="40" r="1.2" fill="white" opacity="0.9"/>
      </g>

      <!-- Mouth (changes with state) -->
      <path class="lucidian-mouth" d="M42 56Q50 63 58 56"
        stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9"/>

      <!-- Sparkle particles (hidden by default, shown on completion) -->
      <g class="lucidian-sparkles" opacity="0">
        <circle cx="15" cy="15" r="2" fill="#C4B5FD"/>
        <circle cx="85" cy="20" r="1.5" fill="#DDD6FE"/>
        <circle cx="12" cy="70" r="1.5" fill="#A78BFA"/>
        <circle cx="88" cy="65" r="2" fill="#C4B5FD"/>
        <circle cx="50" cy="2" r="1.5" fill="#EDE9FE"/>
      </g>
    </svg>
  `;

  return container;
}

/**
 * Set the mascot animation state.
 */
export function setMascotState(
  mascotEl: HTMLElement,
  state: 'idle' | 'thinking' | 'working' | 'done'
): void {
  mascotEl.classList.remove(
    'lucidian-mascot--idle',
    'lucidian-mascot--thinking',
    'lucidian-mascot--working',
    'lucidian-mascot--done',
  );
  mascotEl.classList.add(`lucidian-mascot--${state}`);

  // Auto-reset done state after animation completes
  if (state === 'done') {
    setTimeout(() => {
      mascotEl.classList.remove('lucidian-mascot--done');
      mascotEl.classList.add('lucidian-mascot--idle');
    }, 1500);
  }
}
