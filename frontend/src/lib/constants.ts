export const LYNCH_CATEGORIES = {
  "Fast Grower": {
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description:
      "Companies growing earnings 20%+ annually. The sweet spot for high returns.",
    analogy: "A sports car accelerating on an open highway — fast, exciting, high potential.",
  },
  Stalwart: {
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "Large companies with steady 10-20% growth. Reliable performers.",
    analogy: "A well-maintained SUV — not the fastest, but dependable for the long haul.",
  },
  "Slow Grower": {
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    description: "Mature companies with <10% growth, often paying dividends.",
    analogy: "A city bus — slow but pays you regularly (dividends) to ride along.",
  },
  Cyclical: {
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Companies whose profits follow economic cycles.",
    analogy: "A car on a rollercoaster track — timing your entry and exit is everything.",
  },
  Turnaround: {
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "Companies recovering from a downturn. High risk, high reward.",
    analogy: "A car that just came out of the repair shop — could be good as new, or still have issues.",
  },
  "Asset Play": {
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    description: "Companies sitting on hidden assets not reflected in the stock price.",
    analogy: "A car with a secret turbo engine — the market hasn't noticed its true power yet.",
  },
} as const;

export const PHASE_CONFIG = {
  "Phase 1: Bargain (Low PE / High Growth)": {
    label: "Pole Position",
    shortLabel: "Bargain",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    description: "Low PE + High Growth = the car is fast AND cheap. Buy/Add.",
    angle: 45,
  },
  "Phase 2: Momentum (High PE / High Growth)": {
    label: "Leading the Pack",
    shortLabel: "Momentum",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    description: "High PE + High Growth = the car is fast but the ticket is pricey. Hold/Monitor.",
    angle: 135,
  },
  "Phase 3: Trap (High PE / Low Growth)": {
    label: "Pit Stop Needed",
    shortLabel: "Trap",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    description: "High PE + Low Growth = you're paying top dollar for a slow car. Exit.",
    angle: 225,
  },
  "Phase 4: Turnaround (Low PE / Low Growth)": {
    label: "Back on Track",
    shortLabel: "Turnaround",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    description: "Low PE + Low Growth = cheap but slow. Watch for the engine to rev up.",
    angle: 315,
  },
} as const;

export const TOOLTIPS = {
  pe: "Price-to-Earnings: How much you pay per rupee of earnings. Like the ticket price for a ride.",
  peg: "PEG Ratio: PE divided by growth rate. Like checking if the car's speed justifies the price of the ticket. PEG < 1 = bargain.",
  forwardPE: "Forward PE: What the PE will be based on expected future earnings. A peek into next season's ticket pricing.",
  upside: "How much the stock could go up (or down) from here based on fair value estimation.",
  toneScore: "Management's confidence level during the earnings call. 1 = worried, 10 = beaming with confidence.",
  executionScore: "How well management delivered on their previous promises. Actions speak louder than words.",
  lynchCategory: "Growth classification — categorizing stocks by their speed, reliability, and purpose.",
  fairValue: "Fair Value = EPS x Growth Rate. The PE should roughly equal the growth rate.",
} as const;
