// Lucidian crystal icon - simplified for header
interface SvgPathData {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: string;
}

export const LOGO_SVG: {
  viewBox: string;
  width: string;
  height: string;
  paths: SvgPathData[];
} = {
  viewBox: '0 0 100 100',
  width: '28',
  height: '28',
  // Crystal gem with two eyes - Lucidian mascot
  paths: [
    { d: 'M50 8L78 22V58L50 92L22 58V22L50 8Z', fill: 'currentColor', opacity: '0.2' },
    { d: 'M50 8L78 22V58L50 92L22 58V22L50 8Z', stroke: 'currentColor', strokeWidth: '3', fill: 'none' },
    { d: 'M38 40 A5 5 0 1 1 38 40.01Z', fill: 'currentColor' }, // Left eye
    { d: 'M62 40 A5 5 0 1 1 62 40.01Z', fill: 'currentColor' }, // Right eye
  ],
};

/** Random flavor words shown when response completes (e.g., "Baked for 1:23"). */
export const COMPLETION_FLAVOR_WORDS = [
  'Baked',
  'Cooked',
  'Crunched',
  'Brewed',
  'Crafted',
  'Forged',
  'Conjured',
  'Whipped up',
  'Stirred',
  'Simmered',
  'Toasted',
  'Sautéed',
  'Finagled',
  'Marinated',
  'Distilled',
  'Fermented',
  'Percolated',
  'Steeped',
  'Roasted',
  'Cured',
  'Smoked',
  'Cogitated',
] as const;

/** Random flavor texts shown while Claude is thinking. */
export const FLAVOR_TEXTS = [
  // Classic
  'Thinking...',
  'Pondering...',
  'Processing...',
  'Analyzing...',
  'Considering...',
  'Working on it...',
  'Vibing...',
  'One moment...',
  'On it...',
  // Thoughtful
  'Ruminating...',
  'Contemplating...',
  'Reflecting...',
  'Mulling it over...',
  'Let me think...',
  'Hmm...',
  'Cogitating...',
  'Deliberating...',
  'Weighing options...',
  'Gathering thoughts...',
  // Playful
  'Brewing ideas...',
  'Connecting dots...',
  'Assembling thoughts...',
  'Spinning up neurons...',
  'Loading brilliance...',
  'Consulting the oracle...',
  'Summoning knowledge...',
  'Crunching thoughts...',
  'Dusting off neurons...',
  'Wrangling ideas...',
  'Herding thoughts...',
  'Juggling concepts...',
  'Untangling this...',
  'Piecing it together...',
  // Cozy
  'Sipping coffee...',
  'Warming up...',
  'Getting cozy with this...',
  'Settling in...',
  'Making tea...',
  'Grabbing a snack...',
  // Technical
  'Parsing...',
  'Compiling thoughts...',
  'Running inference...',
  'Querying the void...',
  'Defragmenting brain...',
  'Allocating memory...',
  'Optimizing...',
  'Indexing...',
  'Syncing neurons...',
  // Zen
  'Breathing...',
  'Finding clarity...',
  'Channeling focus...',
  'Centering...',
  'Aligning chakras...',
  'Meditating on this...',
  // Whimsical
  'Asking the stars...',
  'Reading tea leaves...',
  'Shaking the magic 8-ball...',
  'Consulting ancient scrolls...',
  'Decoding the matrix...',
  'Communing with the ether...',
  'Peering into the abyss...',
  'Channeling the cosmos...',
  // Action
  'Diving in...',
  'Rolling up sleeves...',
  'Getting to work...',
  'Tackling this...',
  'On the case...',
  'Investigating...',
  'Exploring...',
  'Digging deeper...',
  // Casual
  'Bear with me...',
  'Hang tight...',
  'Just a sec...',
  'Working my magic...',
  'Almost there...',
  'Give me a moment...',
];
