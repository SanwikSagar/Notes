/*
  Drift — behavior layer.
  Multi-page notebooks with a real page-turn animation, draggable sticky
  notes, an actual drawing canvas, flashcards, a mind map, spaced review,
  and full notebook management — tuned for touch on mobile/tablet.
*/

/* ASMR Sound Engine (Web Audio API)
   Procedural Apple Pencil strokes with natural cushioned paper contact (no harsh clicks),
   distinctive broad felt-tip highlighter swoosh, velocity-modulated scratches,
   pitch-shifted page turns, and tactile sticky note peel/drop audio. */
const SoundFX = (() => {
  let ctx = null;
  let pinkBuffer = null;
  let activeStroke = null;
  let lastPos = null;
  let lastTime = 0;

  function ensureCtx() {
    if (!state.soundEnabled) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    // Resume synchronously — if already running this is a no-op promise
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Plays sound after ensuring the context is running (safe for first-click)
  function playSafe(fn) {
    const context = ensureCtx();
    if (!context) return;
    if (context.state === 'running') {
      fn(context);
    } else {
      context.resume().then(() => fn(context)).catch(() => {});
    }
  }

  function getPinkNoiseBuffer(context) {
    if (pinkBuffer && pinkBuffer.sampleRate === context.sampleRate) return pinkBuffer;
    const bufferSize = 2 * context.sampleRate;
    pinkBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return pinkBuffer;
  }

  // Natural pen tip kept on paper — muted organic acoustic contact
  function penTap(tool = 'pen') {
    const context = ensureCtx();
    if (!context) return;
    const now = context.currentTime;

    // 1. Soft acoustic low-mid paper body tap (natural cushioned landing)
    const osc = context.createOscillator();
    const oscGain = context.createGain();
    osc.type = 'sine';

    if (tool === 'highlighter') {
      // Muted broad felt landing
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.018);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.04, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    } else if (tool === 'eraser') {
      // Rubbery soft landing
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.016);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.035, now + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    } else {
      // Apple Pencil / Fine pen tip touching paper fiber
      osc.frequency.setValueAtTime(460 + Math.random() * 80, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.012);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.045, now + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);
    }

    osc.connect(oscGain);
    oscGain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.025);

    // 2. Micro paper friction breath (gentle textured contact without electronic click)
    const noise = context.createBufferSource();
    noise.buffer = getPinkNoiseBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(tool === 'highlighter' ? 950 : 1400, now);
    filter.Q.setValueAtTime(0.8, now);

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(tool === 'highlighter' ? 0.018 : 0.022, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(context.destination);
    noise.start(now);
    noise.stop(now + 0.015);
  }

  // Start continuous stroke — tailored for pen, highlighter, or eraser
  function startPenStroke(x, y, tool = 'pen') {
    penTap(tool);
    const context = ensureCtx();
    if (!context) return;

    if (activeStroke) endPenStroke();

    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = getPinkNoiseBuffer(context);
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);

    if (tool === 'highlighter') {
      // Broad wet felt marker swoosh: softer, wider bandpass
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(0.45, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.03);
    } else if (tool === 'eraser') {
      // Rubbery paper rub
      filter.frequency.setValueAtTime(750, now);
      filter.Q.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.03);
    } else {
      // Fine pen / pencil stroke
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(0.85, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.03);
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(now);

    activeStroke = { source, filter, gain, tool };
    lastPos = { x, y };
    lastTime = performance.now();
  }

  // Move stroke — dynamically modulates volume & filter cutoff based on movement speed & tool type
  function movePenStroke(x, y) {
    if (!activeStroke) return;
    const context = ensureCtx();
    if (!context) return;

    const now = performance.now();
    const dt = Math.max(1, now - (lastTime || now));
    const dx = x - (lastPos ? lastPos.x : x);
    const dy = y - (lastPos ? lastPos.y : y);
    const speed = Math.hypot(dx, dy) / dt; // px / ms

    const normalized = Math.min(speed / 2.5, 1);
    const audioNow = context.currentTime;

    if (activeStroke.tool === 'highlighter') {
      // Smooth, wide felt-tip glide
      const targetGain = 0.012 + normalized * 0.05;
      const targetFreq = 850 + normalized * 900;
      activeStroke.gain.gain.setTargetAtTime(targetGain, audioNow, 0.04);
      activeStroke.filter.frequency.setTargetAtTime(targetFreq, audioNow, 0.04);
    } else if (activeStroke.tool === 'eraser') {
      // Eraser friction
      const targetGain = 0.01 + normalized * 0.055;
      const targetFreq = 600 + normalized * 800;
      activeStroke.gain.gain.setTargetAtTime(targetGain, audioNow, 0.04);
      activeStroke.filter.frequency.setTargetAtTime(targetFreq, audioNow, 0.04);
    } else {
      // Pencil / pen dynamic scratch
      const targetGain = 0.008 + normalized * 0.042;
      const targetFreq = 1400 + normalized * 2600;
      activeStroke.gain.gain.setTargetAtTime(targetGain, audioNow, 0.04);
      activeStroke.filter.frequency.setTargetAtTime(targetFreq, audioNow, 0.04);
    }

    lastPos = { x, y };
    lastTime = now;
  }

  // Quick release envelope when pen is lifted
  function endPenStroke() {
    if (!activeStroke) return;
    const context = ensureCtx();
    if (context && activeStroke.gain) {
      const now = context.currentTime;
      activeStroke.gain.gain.cancelScheduledValues(now);
      activeStroke.gain.gain.linearRampToValueAtTime(0.0001, now + 0.035);
      const s = activeStroke.source;
      setTimeout(() => {
        try { s.stop(); } catch (_) {}
      }, 45);
    }
    activeStroke = null;
    lastPos = null;
  }

  // Page turns with pitch-shifting (±2%) & WAV file placeholder
  function pageTurn() {
    /* --- Placeholder for your custom sound file: ---
    try {
      const audio = new Audio('sounds/page_turn.wav');
      audio.playbackRate = 0.98 + Math.random() * 0.04; // Pitch-shift ±2%
      audio.volume = 0.4;
      audio.play().catch(() => {});
      return;
    } catch (_) {}
    ------------------------------------------------ */

    const context = ensureCtx();
    if (!context) return;
    const duration = 0.32;
    const now = context.currentTime;

    const pitchFactor = 0.98 + Math.random() * 0.04; // Pitch-shift ±2%
    const startFreq = 2300 * pitchFactor;
    const endFreq = 480 * pitchFactor;

    const source = context.createBufferSource();
    source.buffer = getPinkNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.65;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(now);
    source.stop(now + duration);
  }

  // Sticky Note: Pick up / Peel sound
  function stickyPeel() {
    playSafe((context) => {
      const now = context.currentTime;
      const duration = 0.12;

      const source = context.createBufferSource();
      source.buffer = getPinkNoiseBuffer(context);

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(1300, now + duration);
      filter.Q.value = 0.7;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(now);
      source.stop(now + duration);
    });
  }

  // Sticky Note: Drop / Stick "thwump" — uses playSafe for first-time reliability
  function stickyDrop() {
    playSafe((context) => {
      const now = context.currentTime;

      // 1. Resonant paper landing thump (audible mid-low range ~280Hz -> 180Hz)
      const osc = context.createOscillator();
      const oscGain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.045);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.18, now + 0.006);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      osc.connect(oscGain);
      oscGain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.06);

      // 2. Paper slap snap (tactile surface friction contact ~800-1400Hz)
      const noise = context.createBufferSource();
      noise.buffer = getPinkNoiseBuffer(context);
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(0.7, now);

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(context.destination);
      noise.start(now);
      noise.stop(now + 0.06);
    });
  }

  // Dustbin / Trash Crumple sound — uses playSafe
  function trashDrop() {
    playSafe((context) => {
      const now = context.currentTime;

      // 1. Paper crumple crackle (irregular noise texture, sweeping down)
      const source = context.createBufferSource();
      source.buffer = getPinkNoiseBuffer(context);

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(650, now + 0.2);
      filter.Q.value = 1.2;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(now);
      source.stop(now + 0.22);

      // 2. Muffled thump as it hits the bin
      const osc = context.createOscillator();
      const oscGain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

      oscGain.gain.setValueAtTime(0.0001, now + 0.04);
      oscGain.gain.linearRampToValueAtTime(0.14, now + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc.connect(oscGain);
      oscGain.connect(context.destination);
      osc.start(now + 0.04);
      osc.stop(now + 0.14);
    });
  }

  // Keyboard typing / quick scratch
  let lastScratch = 0;
  function writeScratch() {
    const now = performance.now();
    if (now - lastScratch < 60) return;
    lastScratch = now;

    const context = ensureCtx();
    if (!context) return;
    const duration = 0.028;
    const start = context.currentTime;

    const source = context.createBufferSource();
    source.buffer = getPinkNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + Math.random() * 800;
    filter.Q.value = 0.9;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.02 + Math.random() * 0.01, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + duration);
  }

  return {
    ensureCtx,
    penTap,
    startPenStroke,
    movePenStroke,
    endPenStroke,
    pageTurn,
    stickyPeel,
    stickyDrop,
    trashDrop,
    writeScratch
  };
})();

const notebooks = {
  biology: {
    label: 'Biology', color: 'biology',
    pages: [
      {
        id: 'cell', tab: 'Lecture 1', title: 'The Cell', date: '12 May 2024',
        copy: 'The cell is the basic unit of life.',
        diagram: true,
        blocks: [
          { type: 'list', title: 'Functions', items: ['Provides structure', 'Supports growth', 'Reproduction', 'Responds to stimuli'] },
          { type: 'sticky', tone: 'white', title: 'Key Points', items: ['All living organisms are made of cells', 'Cells come in different shapes and sizes', 'They perform specific functions'] }
        ],
        stickies: [
          { id: 's1', tone: 'pink', x: 74, y: 6, title: 'Important! ★', text: 'Remember to study diagram thoroughly.' },
          { id: 's2', tone: 'outline', x: 6, y: 68, title: 'Question ?', text: 'Why are mitochondria called the powerhouse of the cell?' },
          { id: 's3', tone: 'yellow', x: 62, y: 68, title: 'To Do', checklist: ['Read page 45–50', 'Watch video', 'Make flashcards'] }
        ]
      },
      {
        id: 'photo', tab: 'Diagrams', title: 'Photosynthesis', date: '14 May 2024',
        copy: 'Plants convert light energy into chemical energy stored in glucose.',
        blocks: [
          { type: 'list', title: 'Inputs', items: ['Sunlight', 'Water (H₂O)', 'Carbon dioxide (CO₂)'] },
          { type: 'sticky', tone: 'white', title: 'Outputs', items: ['Glucose (C₆H₁₂O₆)', 'Oxygen (O₂)'] }
        ],
        stickies: [
          { id: 's4', tone: 'pink', x: 60, y: 8, title: 'Formula ★', text: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂' }
        ]
      },
      {
        id: 'genetics', tab: 'Important', title: 'Genetics Basics', date: '18 May 2024',
        copy: 'Traits are passed from parents to offspring through genes.',
        blocks: [
          { type: 'list', title: 'Key terms', items: ['Gene', 'Allele', 'Dominant vs recessive', 'Genotype vs phenotype'] }
        ],
        stickies: [
          { id: 's5', tone: 'outline', x: 58, y: 10, title: 'Question ?', text: 'What is the difference between genotype and phenotype?' }
        ]
      }
    ],
    flashcards: [
      { q: 'What is the basic unit of life?', a: 'The cell.' },
      { q: 'What organelle produces energy for the cell?', a: 'The mitochondria — the "powerhouse of the cell".' },
      { q: 'What do plants need for photosynthesis?', a: 'Sunlight, water, and carbon dioxide.' },
      { q: 'What is an allele?', a: 'A variant form of a gene.' }
    ],
    mindmap: {
      center: 'Biology',
      branches: [
        { label: 'Cells', x: 20, y: 20 },
        { label: 'Genetics', x: 80, y: 22 },
        { label: 'Photosynthesis', x: 78, y: 78 },
        { label: 'Ecosystems', x: 18, y: 78 },
        { label: 'Evolution', x: 50, y: 12 }
      ]
    }
  },
  physics: {
    label: 'Physics', color: 'physics',
    pages: [
      {
        id: 'motion', tab: 'Lecture 1', title: "Newton's Laws", date: '10 May 2024',
        copy: 'Three laws describe the relationship between a body and the forces acting on it.',
        blocks: [
          { type: 'list', title: 'The three laws', items: ['Inertia', 'F = ma', 'Action & reaction'] },
          { type: 'sticky', tone: 'white', title: 'Everyday examples', items: ['Seatbelts (inertia)', 'Rocket launches (3rd law)', 'Pushing a shopping cart (2nd law)'] }
        ],
        stickies: [
          { id: 'p1', tone: 'pink', x: 62, y: 8, title: 'Formula ★', text: 'F = ma' }
        ]
      },
      {
        id: 'energy', tab: 'Diagrams', title: 'Energy & Work', date: '13 May 2024',
        copy: 'Energy is the capacity to do work; it is never created or destroyed, only transformed.',
        blocks: [
          { type: 'list', title: 'Forms of energy', items: ['Kinetic', 'Potential', 'Thermal', 'Electrical'] }
        ],
        stickies: []
      }
    ],
    flashcards: [
      { q: "What is Newton's second law?", a: 'Force equals mass times acceleration (F = ma).' },
      { q: 'What is kinetic energy?', a: 'The energy an object has due to its motion.' },
      { q: 'Can energy be destroyed?', a: 'No — it can only be transformed from one form to another.' }
    ],
    mindmap: {
      center: 'Physics',
      branches: [
        { label: 'Motion', x: 22, y: 22 },
        { label: 'Energy', x: 80, y: 20 },
        { label: 'Electricity', x: 78, y: 80 },
        { label: 'Waves', x: 20, y: 80 }
      ]
    }
  },
  chemistry: {
    label: 'Chemistry', color: 'chemistry',
    pages: [
      {
        id: 'periodic', tab: 'Lecture 1', title: 'The Periodic Table', date: '9 May 2024',
        copy: 'Elements are arranged by increasing atomic number and recurring chemical properties.',
        blocks: [
          { type: 'list', title: 'Groups to know', items: ['Alkali metals', 'Halogens', 'Noble gases'] }
        ],
        stickies: [
          { id: 'c1', tone: 'outline', x: 60, y: 8, title: 'Question ?', text: 'Why are noble gases unreactive?' }
        ]
      }
    ],
    flashcards: [
      { q: 'What determines an element\'s position on the periodic table?', a: 'Its atomic number.' },
      { q: 'Why are noble gases unreactive?', a: 'Their outer electron shell is already full.' }
    ],
    mindmap: {
      center: 'Chemistry',
      branches: [
        { label: 'Elements', x: 22, y: 24 },
        { label: 'Bonds', x: 80, y: 24 },
        { label: 'Reactions', x: 50, y: 82 }
      ]
    }
  },
  maths: {
    label: 'Maths', color: 'maths',
    pages: [
      {
        id: 'algebra', tab: 'Lecture 1', title: 'Quadratic Equations', date: '8 May 2024',
        copy: 'A quadratic equation has the form ax² + bx + c = 0.',
        blocks: [{ type: 'list', title: 'Solving methods', items: ['Factoring', 'Completing the square', 'The quadratic formula'] }],
        stickies: [{ id: 'm1', tone: 'pink', x: 60, y: 8, title: 'Formula ★', text: 'x = (-b ± √(b² - 4ac)) / 2a' }]
      }
    ],
    flashcards: [{ q: 'What is the quadratic formula?', a: 'x = (-b ± √(b² - 4ac)) / 2a' }],
    mindmap: { center: 'Maths', branches: [{ label: 'Algebra', x: 24, y: 24 }, { label: 'Geometry', x: 78, y: 30 }, { label: 'Calculus', x: 50, y: 80 }] }
  },
  personal: {
    label: 'Personal', color: 'personal',
    pages: [
      {
        id: 'goals', tab: 'This Week', title: 'Weekly Goals', date: 'This week',
        copy: 'Small consistent steps beat big irregular ones.',
        blocks: [{ type: 'list', title: 'Focus areas', items: ['Sleep by 11pm', 'Read 20 pages a day', 'Call mom on Sunday'] }],
        stickies: []
      }
    ],
    flashcards: [],
    mindmap: { center: 'Personal', branches: [{ label: 'Health', x: 24, y: 24 }, { label: 'Work', x: 78, y: 24 }, { label: 'Relationships', x: 50, y: 82 }] }
  },
  ideas: {
    label: 'Ideas', color: 'ideas',
    pages: [
      {
        id: 'sparks', tab: 'Sparks', title: 'Random Sparks', date: 'Ongoing',
        copy: 'A running list of things worth chasing someday.',
        blocks: [{ type: 'list', title: 'Sparks', items: ['A cozy notes app', 'A zine about slow mornings', 'Learn to throw pottery'] }],
        stickies: []
      }
    ],
    flashcards: [],
    mindmap: { center: 'Ideas', branches: [{ label: 'Apps', x: 24, y: 24 }, { label: 'Writing', x: 78, y: 24 }, { label: 'Crafts', x: 50, y: 82 }] }
  }
};

const state = {
  notebookId: 'biology',
  pageIndex: 0,
  view: 'notes',
  tool: 'none',
  flashcardIndex: 0,
  flashcardFlipped: false,
  review: {},
  drawings: {},
  undoStacks: {},
  redoStacks: {},
  quickFilter: 'all',
  recents: ['biology'],
  reviewFilter: 'due',
  revealed: new Set(),
  pageScale: 1,
  soundEnabled: false
};

const NOTEBOOK_COLORS = [
  { id: 'biology', hex: '#5a9d6f' },
  { id: 'physics', hex: '#5088c9' },
  { id: 'chemistry', hex: '#9270c9' },
  { id: 'maths', hex: '#d9822f' },
  { id: 'personal', hex: '#d1608a' },
  { id: 'ideas', hex: '#3aa79b' }
];

const brushState = { color: '#3a3327', width: 2.4 };

function currentNotebook() {
  return notebooks[state.notebookId];
}

function currentPage() {
  return currentNotebook().pages[state.pageIndex];
}

/* ---------- Sidebar / notebook list ---------- */

function filteredNotebookEntries() {
  const entries = Object.entries(notebooks);
  if (state.quickFilter === 'favorites') return entries.filter(([, nb]) => nb.favorite);
  if (state.quickFilter === 'recents') {
    return state.recents.map((id) => [id, notebooks[id]]).filter(([, nb]) => nb);
  }
  if (state.quickFilter === 'unsorted') {
    return entries.filter(([id, nb]) => !nb.favorite && !state.recents.includes(id));
  }
  return entries;
}

function renderNotebookList() {
  const list = document.querySelector('#notebookList');
  const entries = filteredNotebookEntries();

  list.innerHTML = entries.length
    ? entries.map(([id, nb]) => `
      <li data-notebook="${id}" class="${id === state.notebookId ? 'is-active' : ''}" title="${nb.label}">
        <span class="dot dot-${nb.color}"></span>
        <span class="nav-text">${nb.label}</span>
        <button class="nb-fav-btn${nb.favorite ? ' is-fav' : ''}" data-fav="${id}" aria-label="Toggle favorite" title="Favorite">★</button>
        <button class="nb-delete-btn" data-delete-notebook="${id}" aria-label="Delete notebook" title="Delete notebook">×</button>
      </li>
    `).join('')
    : `<li class="nb-empty">${state.quickFilter === 'all' ? 'No notebooks yet.' : 'Nothing here yet.'}</li>`;

  list.querySelectorAll('li[data-notebook]').forEach((item) => {
    item.addEventListener('click', () => switchNotebook(item.dataset.notebook));
  });

  list.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      notebooks[btn.dataset.fav].favorite = !notebooks[btn.dataset.fav].favorite;
      renderNotebookList();
    });
  });

  list.querySelectorAll('[data-delete-notebook]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      requestDeleteNotebook(btn.dataset.deleteNotebook);
    });
  });

  scheduleSave();
}

function requestDeleteNotebook(id) {
  const nb = notebooks[id];
  if (!nb || Object.keys(notebooks).length <= 1) return;
  openModal(`
    <h3>Delete "${nb.label}"?</h3>
    <p>This removes all its pages, flashcards, and mind map. This can't be undone.</p>
    <div class="modal-actions">
      <button class="modal-btn cancel" data-modal-close>Cancel</button>
      <button class="modal-btn danger" id="confirmDeleteBtn">Delete</button>
    </div>
  `, {
    onOpen: (box) => {
      box.querySelector('#confirmDeleteBtn').addEventListener('click', () => {
        delete notebooks[id];
        state.recents = state.recents.filter((r) => r !== id);
        if (state.notebookId === id) {
          switchNotebook(Object.keys(notebooks)[0]);
        } else {
          renderNotebookList();
        }
        closeModal();
      });
    }
  });
}

function switchNotebook(id) {
  if (!notebooks[id]) return;
  state.notebookId = id;
  state.pageIndex = 0;
  state.flashcardIndex = 0;
  state.flashcardFlipped = false;
  state.recents = [id, ...state.recents.filter((r) => r !== id)].slice(0, 6);
  state.revealed = new Set();

  document.querySelector('#dropdownDot').className = `dot dot-${notebooks[id].color}`;
  document.querySelector('#dropdownLabel').textContent = `${notebooks[id].label} Notes`;
  renderNotebookList();

  renderPageTabs();
  renderPage();
  renderFlashcard();
  renderMindmap();
  renderReview();
  closeSidebar();
}

/* ---------- Page tabs + page turn animation ---------- */

function renderPageTabs() {
  const rail = document.querySelector('#pageTabsRail');
  const nb = currentNotebook();
  rail.innerHTML = nb.pages.map((page, index) => `
    <div class="page-tab-wrap">
      <button class="page-tab tab-${nb.color}${index === state.pageIndex ? ' is-active' : ''}" data-index="${index}" title="Double-click to rename">${page.tab}</button>
      <button class="page-tab-rename" data-rename-page="${index}" aria-label="Rename page">✎</button>
      ${nb.pages.length > 1 ? `<button class="page-tab-delete" data-delete-page="${index}" aria-label="Delete page">×</button>` : ''}
    </div>
  `).join('');

  rail.querySelectorAll('.page-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      goToPage(Number(tab.dataset.index));
      const wrap = tab.closest('.page-tab-wrap');
      rail.querySelectorAll('.page-tab-wrap.is-revealed').forEach((w) => {
        if (w !== wrap) w.classList.remove('is-revealed');
      });
      wrap.classList.toggle('is-revealed');
    });
    tab.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      openRenamePageModal(Number(tab.dataset.index));
    });
  });

  rail.querySelectorAll('[data-rename-page]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      openRenamePageModal(Number(btn.dataset.renamePage));
    });
  });

  rail.querySelectorAll('[data-delete-page]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      requestDeletePage(Number(btn.dataset.deletePage));
    });
  });

  renderPageDots();
  scrollActiveTabIntoView();
}

function openRenamePageModal(index) {
  const nb = currentNotebook();
  const page = nb.pages[index];
  if (!page) return;
  openModal(`
    <h3>Rename page</h3>
    <input type="text" id="renameTabInput" placeholder="Tab label" value="${page.tab}">
    <input type="text" id="renameTitleInput" placeholder="Page title" value="${page.title}">
    <div class="modal-actions">
      <button class="modal-btn cancel" data-modal-close>Cancel</button>
      <button class="modal-btn confirm" id="savePageRenameBtn">Save</button>
    </div>
  `, {
    onOpen: (box) => {
      const tabInput = box.querySelector('#renameTabInput');
      const titleInput = box.querySelector('#renameTitleInput');
      tabInput.focus();
      tabInput.select();
      const save = () => {
        const tab = tabInput.value.trim();
        const title = titleInput.value.trim();
        if (tab) page.tab = tab;
        if (title) page.title = title;
        renderPageTabs();
        if (index === state.pageIndex) renderPageContent();
        closeModal();
      };
      box.querySelector('#savePageRenameBtn').addEventListener('click', save);
      [tabInput, titleInput].forEach((input) => {
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') save(); });
      });
    }
  });
}

function requestDeletePage(index) {
  const nb = currentNotebook();
  if (nb.pages.length <= 1) return;
  const page = nb.pages[index];
  openModal(`
    <h3>Delete this page?</h3>
    <p>"${page.title}" will be removed from this notebook. This can't be undone.</p>
    <div class="modal-actions">
      <button class="modal-btn cancel" data-modal-close>Cancel</button>
      <button class="modal-btn danger" id="confirmDeletePageBtn">Delete</button>
    </div>
  `, {
    onOpen: (box) => {
      box.querySelector('#confirmDeletePageBtn').addEventListener('click', () => {
        nb.pages.splice(index, 1);
        if (state.pageIndex >= nb.pages.length) state.pageIndex = nb.pages.length - 1;
        else if (index < state.pageIndex) state.pageIndex -= 1;
        renderPage();
        closeModal();
      });
    }
  });
}

function renderPageDots() {
  const dots = document.querySelector('#pageDots');
  const nb = currentNotebook();
  /* Past a handful of pages, individual dots stop being readable — a
     compact "3 / 12" counter scales to any notebook size instead. */
  if (nb.pages.length > 8) {
    dots.innerHTML = `<span class="page-count">${state.pageIndex + 1} / ${nb.pages.length}</span>`;
    return;
  }
  dots.innerHTML = nb.pages.map((_, index) => `<span class="page-dot${index === state.pageIndex ? ' is-active' : ''}"></span>`).join('');
}

/* Keeps the active tab scrolled into view in the tab strip whenever the
   page changes, instead of leaving the user to hunt for it by hand. */
function scrollActiveTabIntoView() {
  const active = document.querySelector('.page-tab.is-active');
  if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
}

function openPagesListModal() {
  const nb = currentNotebook();
  const rows = nb.pages.map((page, index) => `
    <div class="pages-list-row${index === state.pageIndex ? ' is-active' : ''}" data-goto-page="${index}">
      <span class="dot dot-${nb.color}"></span>
      <span class="pages-list-text">
        <strong>${page.tab}</strong>
        <span>${page.title}</span>
      </span>
      <button class="mini-btn" data-rename-from-list="${index}" aria-label="Rename page">✎</button>
      ${nb.pages.length > 1 ? `<button class="mini-btn" data-delete-from-list="${index}" aria-label="Delete page">×</button>` : ''}
    </div>
  `).join('');

  openModal(`
    <h3>All pages</h3>
    <p>${nb.pages.length} page${nb.pages.length === 1 ? '' : 's'} in "${nb.label}" — tap one to jump to it.</p>
    <div class="pages-list">${rows}</div>
    <div class="modal-actions">
      <button class="modal-btn cancel" data-modal-close>Close</button>
    </div>
  `, {
    onOpen: (box) => {
      box.querySelectorAll('[data-goto-page]').forEach((row) => {
        row.addEventListener('click', (event) => {
          if (event.target.closest('button')) return;
          goToPage(Number(row.dataset.gotoPage));
          closeModal();
        });
      });
      box.querySelectorAll('[data-rename-from-list]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          closeModal();
          openRenamePageModal(Number(btn.dataset.renameFromList));
        });
      });
      box.querySelectorAll('[data-delete-from-list]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          closeModal();
          requestDeletePage(Number(btn.dataset.deleteFromList));
        });
      });
    }
  });
}

function wirePagesListModal() {
  const btn = document.querySelector('#pagesListBtn');
  if (btn) btn.addEventListener('click', openPagesListModal);
}

/* A small deterministic wobble per note (seeded by its id) so stickies of
   the same color don't all sit at the exact same tilt. */
function jitterAngle(id, tone) {
  const base = { pink: -2, outline: 1.5, yellow: -1, white: 0 }[tone] || 0;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const wobble = ((Math.abs(hash) % 100) / 100) * 3 - 1.5;
  return (base + wobble).toFixed(2);
}

function stickyHTML(sticky) {
  const resizeHandle = `<span class="resize-handle" data-resize="${sticky.id}"></span>`;
  const widthStyle = sticky.width ? `--w:${sticky.width}px; ` : '';
  const rotStyle = sticky.image ? '' : `--rot:${jitterAngle(sticky.id, sticky.tone)}deg; `;

  if (sticky.image) {
    return `
      <article class="sticky sticky-image sticky-loose" data-id="${sticky.id}" style="${widthStyle}--x:${sticky.x}%; --y:${sticky.y}%">
        <img src="${sticky.image}" alt="${sticky.title || 'Image note'}" draggable="false">
        ${resizeHandle}
      </article>
    `;
  }

  if (sticky.checklist) {
    return `
      <article class="sticky sticky-${sticky.tone} sticky-loose" data-id="${sticky.id}" style="${widthStyle}${rotStyle}--x:${sticky.x}%; --y:${sticky.y}%">
        <p class="sticky-title" contenteditable="true" data-sticky-title="${sticky.id}">${sticky.title}</p>
        <ul class="checklist">
          ${sticky.checklist.map((text, i) => `
            <li>
              <label>
                <input type="checkbox" data-check="${sticky.id}-${i}">
                <span contenteditable="true" data-check-text="${sticky.id}:${i}">${text}</span>
              </label>
              <button class="mini-btn" data-del-check="${sticky.id}:${i}" aria-label="Remove item">×</button>
            </li>`).join('')}
        </ul>
        <button class="add-item-btn" data-add-check="${sticky.id}">+ Add item</button>
        ${resizeHandle}
      </article>
    `;
  }

  if (sticky.list) {
    return `
      <article class="sticky sticky-${sticky.tone} sticky-loose" data-id="${sticky.id}" style="${widthStyle}${rotStyle}--x:${sticky.x}%; --y:${sticky.y}%">
        <p class="sticky-title" contenteditable="true" data-sticky-title="${sticky.id}">${sticky.title}</p>
        <ul>
          ${sticky.list.map((text, i) => `
            <li>
              <span contenteditable="true" data-list-item="${sticky.id}:${i}">${text}</span>
              <button class="mini-btn" data-del-list-item="${sticky.id}:${i}" aria-label="Remove item">×</button>
            </li>`).join('')}
        </ul>
        <button class="add-item-btn" data-add-list-item="${sticky.id}">+ Add item</button>
        ${resizeHandle}
      </article>
    `;
  }
  return `
    <article class="sticky sticky-${sticky.tone} sticky-loose" data-id="${sticky.id}" style="${widthStyle}${rotStyle}--x:${sticky.x}%; --y:${sticky.y}%">
      <p class="sticky-title" contenteditable="true" data-sticky-title="${sticky.id}">${sticky.title}</p>
      <p contenteditable="true" data-sticky-text="${sticky.id}">${sticky.text}</p>
      ${resizeHandle}
    </article>
  `;
}

function blockHTML(block, index) {
  if (block.type === 'list') {
    return `
      <div class="functions-block" data-block="${index}">
        <div class="block-head">
          <p class="block-title-list" contenteditable="true" data-block-title="${index}">${block.title}</p>
          <button class="mini-btn" data-del-block="${index}" aria-label="Remove block">×</button>
        </div>
        <ul>
          ${block.items.map((item, i) => `
            <li>
              <span contenteditable="true" data-block-item="${index}:${i}">${item}</span>
              <button class="mini-btn" data-del-item="${index}:${i}" aria-label="Remove item">×</button>
            </li>`).join('')}
        </ul>
        <button class="add-item-btn" data-add-item="${index}">+ Add item</button>
      </div>
    `;
  }
  return `
    <article class="sticky sticky-${block.tone}" data-block="${index}">
      <div class="block-head">
        <p class="sticky-title" contenteditable="true" data-block-title="${index}">${block.title}</p>
        <button class="mini-btn" data-del-block="${index}" aria-label="Remove block">×</button>
      </div>
      <ul>
        ${block.items.map((item, i) => `
          <li>
            <span contenteditable="true" data-block-item="${index}:${i}">${item}</span>
            <button class="mini-btn" data-del-item="${index}:${i}" aria-label="Remove item">×</button>
          </li>`).join('')}
      </ul>
      <button class="add-item-btn" data-add-item="${index}">+ Add item</button>
    </article>
  `;
}

function cellDiagramHTML() {
  return `
    <div class="cell-diagram" role="img" aria-label="Diagram of a cell showing the nucleus, Golgi apparatus, cell membrane, mitochondria, and cytoplasm">
      <svg viewBox="0 0 320 200">
        <ellipse cx="160" cy="100" rx="150" ry="88" class="cell-membrane"/>
        <circle cx="120" cy="95" r="42" class="cell-nucleus"/>
        <circle cx="120" cy="95" r="12" class="cell-nucleolus"/>
        <path d="M205 55c14-6 30-2 34 8s-6 18-18 16-28-16-16-24z" class="cell-golgi"/>
        <path d="M215 78c12-4 26 0 28 9s-8 14-18 12-20-14-10-21z" class="cell-golgi"/>
        <ellipse cx="225" cy="135" rx="20" ry="10" class="cell-mito" transform="rotate(-18 225 135)"/>
        <ellipse cx="95" cy="150" rx="18" ry="9" class="cell-mito" transform="rotate(14 95 150)"/>
      </svg>
      <span class="diagram-label" style="--x:34%; --y:12%">Nucleus</span>
      <span class="diagram-label" style="--x:74%; --y:16%">Golgi Apparatus</span>
      <span class="diagram-label" style="--x:6%; --y:6%">Cell Membrane</span>
      <span class="diagram-label" style="--x:78%; --y:78%">Mitochondria</span>
      <span class="diagram-label" style="--x:6%; --y:82%">Cytoplasm</span>
    </div>
  `;
}

function renderPageContent() {
  const page = currentPage();
  const wrap = document.querySelector('#pageScaleLayer');
  const shell = document.querySelector('#notebookPage');
  wrap.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
  wrap.classList.add(`bg-${page.background || 'ruled'}`);
  // The ruled/grid lines live on the shell (real, unscaled pixel size) rather
  // than the scaled inner layer, so their spacing stays crisp and even at
  // any zoom level instead of banding when --page-scale is a fraction.
  shell.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
  shell.classList.add(`bg-${page.background || 'ruled'}`);
  document.querySelectorAll('#pageBgMenu [data-bg]').forEach((option) => {
    option.classList.toggle('is-active', option.dataset.bg === (page.background || 'ruled'));
  });
  wrap.innerHTML = `
    <div class="spiral" aria-hidden="true"></div>
    <canvas class="draw-canvas" id="drawCanvas"></canvas>
    <div class="page-fade-top" id="pageFadeTop"></div>
    <div class="page-content" id="pageContent">
      <div class="page-content-inner" id="pageContentInner">
        <div class="page-head">
          <h2 contenteditable="true" data-page-title>${page.title}</h2>
          <span class="page-date" contenteditable="true" data-page-date>${page.date}</span>
        </div>
        <p class="page-copy" contenteditable="true" data-page-copy>${page.copy}</p>
        ${page.diagram ? cellDiagramHTML() : ''}
        <div class="page-row">
          ${(page.blocks || []).map((block, index) => blockHTML(block, index)).join('')}
        </div>
      </div>
    </div>
    <div class="page-fade-bottom" id="pageFadeBottom"></div>
    ${(page.stickies || []).map(stickyHTML).join('')}
  `;

  wirePageMeta();
  wireBlocks();
  wireChecklist();
  wireStickyInteractions();
  wireStickyEditing();
  setupCanvas();
  wirePageScrollFade();
  fitPageContentToFrame();
  scheduleSave();
}

/* Shrinks the page's content as one unit (never individual lines) just
   enough to fit the page without scrolling, so the whole page is visible
   at a glance — only falling back to a scrollbar if it's still too much
   even at the smallest readable size. */
function fitPageContentToFrame() {
  const content = document.querySelector('#pageContent');
  const inner = document.querySelector('#pageContentInner');
  if (!content || !inner) return;

  inner.style.transform = 'scale(1)';
  inner.style.width = '100%';
  const naturalHeight = inner.scrollHeight;
  const available = content.clientHeight;
  const MIN_SCALE = 0.62;
  let scale = 1;

  if (naturalHeight > available) {
    scale = Math.max(MIN_SCALE, available / naturalHeight);
    inner.style.transform = `scale(${scale})`;
    inner.style.width = `${100 / scale}%`;
  }

  // Only a fallback: at the minimum scale, unusually long pages may still
  // slightly overflow, so scrolling stays available rather than clipping.
  content.style.overflowY = naturalHeight * scale > available + 2 ? 'auto' : 'hidden';
}

function wirePageScrollFade() {
  const content = document.querySelector('#pageContent');
  const top = document.querySelector('#pageFadeTop');
  const bottom = document.querySelector('#pageFadeBottom');
  if (!content || !top || !bottom) return;

  function update() {
    top.classList.toggle('is-visible', content.scrollTop > 4);
    bottom.classList.toggle('is-visible', content.scrollTop + content.clientHeight < content.scrollHeight - 4);
  }

  content.addEventListener('scroll', update);
  requestAnimationFrame(update);
}

function renderPage() {
  renderPageContent();
  renderPageTabs();
}

function addNewPage() {
  const nb = currentNotebook();
  const number = nb.pages.length + 1;
  nb.pages.push({
    id: `page${Date.now()}`,
    tab: `Page ${number}`,
    title: 'Untitled page',
    date: 'Today',
    copy: 'Start writing…',
    blocks: [],
    stickies: []
  });
  goToPage(nb.pages.length - 1, 'next');
}

function wireAddPage() {
  document.querySelector('#addPageBtn').addEventListener('click', addNewPage);
}

function goToPage(index, direction) {
  const nb = currentNotebook();
  if (index < 0 || index >= nb.pages.length || index === state.pageIndex) return;
  const dir = direction || (index > state.pageIndex ? 'next' : 'prev');
  flipToPage(index, dir);
}

function flipToPage(index, dir) {
  const wrap = document.querySelector('#notebookPage');
  saveCanvasSnapshot();
  SoundFX.pageTurn();
  wrap.classList.add(dir === 'next' ? 'is-turning-next' : 'is-turning-prev');

  setTimeout(() => {
    state.pageIndex = index;
    renderPageContent();
    wrap.classList.remove('is-turning-next', 'is-turning-prev');
    wrap.classList.add(dir === 'next' ? 'is-entering-next' : 'is-entering-prev');
    requestAnimationFrame(() => {
      wrap.classList.add('is-settled');
    });
    setTimeout(() => {
      wrap.classList.remove('is-entering-next', 'is-entering-prev', 'is-settled');
    }, 260);
    renderPageTabs();
  }, 220);
}

function wireSwipe() {
  const stage = document.querySelector('#pageFlipStage');
  let startX = 0;
  let startY = 0;
  const DRAW_TOOLS = ['pen', 'highlighter', 'eraser'];

  stage.addEventListener('touchstart', (event) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', (event) => {
    // A pen/highlighter/eraser stroke shouldn't also flip the page —
    // only "select" mode (or any non-drawing tool) reacts to swipes.
    if (DRAW_TOOLS.includes(state.tool)) return;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const nb = currentNotebook();
    if (dx < 0 && state.pageIndex < nb.pages.length - 1) goToPage(state.pageIndex + 1, 'next');
    else if (dx > 0 && state.pageIndex > 0) goToPage(state.pageIndex - 1, 'prev');
  }, { passive: true });
}

function wirePageNav() {
  document.querySelector('#prevPageBtn').addEventListener('click', () => goToPage(state.pageIndex - 1, 'prev'));
  document.querySelector('#nextPageBtn').addEventListener('click', () => goToPage(state.pageIndex + 1, 'next'));
}

/*
  The page is authored at a fixed 700x990 logical size, then scaled to
  exactly fill the stage — up on a roomy screen, down on a small one —
  so it always fits the visible area with no scrolling needed, while
  every element inside (text, stickies, the diagram) grows or shrinks
  together as one unit and the page always sits snugly under its tabs.
*/
const PAGE_BASE_WIDTH = 700;
const PAGE_BASE_HEIGHT = 990;
let activeCanvasResize = null;

// Shared with wirePinchResize() below: lets the global two-finger tracker
// (wired once) cancel an in-progress single-finger drag on whichever sticky
// a pinch starts on, without both gestures fighting over the same pointer.
const stickyDragControllers = new WeakMap();
let activePinchSticky = null;

function fitPageScale() {
  const stage = document.querySelector('#pageFlipStage');
  const shell = document.querySelector('#notebookPage');
  if (!stage || !shell) return;

  const stageStyles = getComputedStyle(stage);
  const availableW = stage.clientWidth - parseFloat(stageStyles.paddingLeft) - parseFloat(stageStyles.paddingRight);
  const availableH = stage.clientHeight - parseFloat(stageStyles.paddingTop) - parseFloat(stageStyles.paddingBottom);
  if (availableW <= 0 || availableH <= 0) return;

  const scale = Math.min(availableW / PAGE_BASE_WIDTH, availableH / PAGE_BASE_HEIGHT);

  shell.style.width = `${PAGE_BASE_WIDTH * scale}px`;
  shell.style.height = `${PAGE_BASE_HEIGHT * scale}px`;
  shell.style.setProperty('--page-scale', scale.toFixed(4));
  state.pageScale = scale;
  if (activeCanvasResize) activeCanvasResize();
  alignPageTabsToPage(PAGE_BASE_WIDTH * scale);
  fitPageContentToFrame();
}

/* Aligns the "Lecture 1 / Diagrams / ..." tab row's left edge with the
   page's left edge (instead of hugging the page-area's own left edge
   while the centered page floats elsewhere) — but, unlike matching the
   page's exact width, leaves the row free to use the rest of the
   available space so its tabs never get clipped or forced to scroll. */
function alignPageTabsToPage(pageWidth) {
  const row = document.querySelector('#pageTabsRow');
  const pageArea = document.querySelector('.page-area');
  if (!row || !pageArea) return;
  const offset = Math.max(0, (pageArea.clientWidth - pageWidth) / 2);
  row.style.maxWidth = 'none';
  row.style.marginLeft = `${offset}px`;
  row.style.marginRight = '0';
}

function wirePageScaling() {
  const stage = document.querySelector('#pageFlipStage');
  if (!stage) return;
  fitPageScale();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => fitPageScale()).observe(stage);
  } else {
    window.addEventListener('resize', fitPageScale);
  }
}

/* Below TOOLBAR_LOGICAL_WIDTH the row would start wrapping, so it switches
   to a fixed layout scaled down as one unit instead; above that width it
   stays a normal full-bleed flex row (pill on the left, icons flush right). */
const TOOLBAR_LOGICAL_WIDTH = 580;

function fitToolbarScale() {
  const toolbar = document.querySelector('#toolbar');
  const inner = document.querySelector('#toolbarInner');
  if (!toolbar || !inner || !toolbar.clientWidth) return;

  if (toolbar.clientWidth >= TOOLBAR_LOGICAL_WIDTH) {
    inner.classList.remove('is-compact');
    return;
  }

  inner.classList.add('is-compact');
  const scale = toolbar.clientWidth / TOOLBAR_LOGICAL_WIDTH;
  toolbar.style.setProperty('--toolbar-scale', scale.toFixed(4));
}

function wireToolbarScaling() {
  const toolbar = document.querySelector('#toolbar');
  if (!toolbar) return;
  fitToolbarScale();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => fitToolbarScale()).observe(toolbar);
  } else {
    window.addEventListener('resize', fitToolbarScale);
  }
}

/* ---------- Sticky notes ---------- */

function trashZoneEl() {
  return document.querySelector('#trashZone');
}

function isOverTrash(clientX, clientY) {
  const trash = trashZoneEl();
  if (!trash) return false;
  const rect = trash.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function wireStickyInteractions() {
  const page = document.querySelector('#notebookPage');
  const DRAG_THRESHOLD = 6;

  page.querySelectorAll('.sticky-loose').forEach((sticky) => {
    let dragging = false;
    let pendingStart = null;
    let offsetX = 0;
    let offsetY = 0;

    const beginDrag = (clientX, clientY, pointerId) => {
      dragging = true;
      SoundFX.stickyPeel();
      sticky.setPointerCapture(pointerId);
      // Editable text may have grabbed focus on pointerdown before the
      // move threshold was reached — drop it so the caret doesn't linger.
      if (document.activeElement && sticky.contains(document.activeElement)) document.activeElement.blur();
      const rect = page.getBoundingClientRect();
      offsetX = clientX - rect.left - (parseFloat(sticky.style.getPropertyValue('--x')) / 100) * rect.width;
      offsetY = clientY - rect.top - (parseFloat(sticky.style.getPropertyValue('--y')) / 100) * rect.height;
      sticky.classList.add('is-dragging');
      trashZoneEl() && trashZoneEl().classList.add('is-visible');
    };

    // Called by wirePinchResize() the moment a second finger starts a
    // pinch on this note, so a single-finger drag never fights the resize.
    const cancelDrag = () => {
      pendingStart = null;
      if (!dragging) return;
      dragging = false;
      sticky.classList.remove('is-dragging');
      const trash = trashZoneEl();
      if (trash) trash.classList.remove('is-visible', 'is-target');
    };
    stickyDragControllers.set(sticky, { cancelDrag });

    const commitDragEnd = () => {
      pendingStart = null;
      if (!dragging) return;
      dragging = false;
      sticky.classList.remove('is-dragging');
      const trash = trashZoneEl();
      const droppedOnTrash = trash && trash.classList.contains('is-target');
      if (trash) { trash.classList.remove('is-visible', 'is-target'); }

      if (droppedOnTrash) {
        SoundFX.trashDrop();
        const id = sticky.dataset.id;
        currentPage().stickies = (currentPage().stickies || []).filter((s) => s.id !== id);
        renderPageContent();
        return;
      }

      SoundFX.stickyDrop();
      const id = sticky.dataset.id;
      const data = (currentPage().stickies || []).find((s) => s.id === id);
      if (data) {
        data.x = parseFloat(sticky.style.getPropertyValue('--x'));
        data.y = parseFloat(sticky.style.getPropertyValue('--y'));
      }
      scheduleSave();
    };

    sticky.addEventListener('pointerdown', (event) => {
      // Buttons/inputs/resize-handle keep their normal behavior; everything
      // else (including editable text) becomes a drag candidate — a plain
      // tap still reaches the text underneath since we don't intercept
      // it until movement crosses DRAG_THRESHOLD (see pointermove below).
      if (event.target.closest('input') || event.target.closest('button') || event.target.closest('.resize-handle')) return;
      // A pinch is already in progress on this note — a second pointerdown
      // (e.g. a third finger) shouldn't start a competing drag.
      if (activePinchSticky === sticky) return;
      pendingStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    });

    sticky.addEventListener('pointermove', (event) => {
      if (activePinchSticky === sticky) return;
      if (!pendingStart || pendingStart.pointerId !== event.pointerId) return;
      if (!dragging) {
        const dx = event.clientX - pendingStart.x;
        const dy = event.clientY - pendingStart.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        beginDrag(pendingStart.x, pendingStart.y, event.pointerId);
      }
      const rect = page.getBoundingClientRect();
      // Allow a small overhang so notes can sit flush against — or slightly past — the page edge.
      let xPct = ((event.clientX - rect.left - offsetX) / rect.width) * 100;
      let yPct = ((event.clientY - rect.top - offsetY) / rect.height) * 100;
      xPct = Math.max(-8, Math.min(96, xPct));
      yPct = Math.max(-8, Math.min(96, yPct));
      sticky.style.setProperty('--x', `${xPct}%`);
      sticky.style.setProperty('--y', `${yPct}%`);
      const trash = trashZoneEl();
      if (trash) trash.classList.toggle('is-target', isOverTrash(event.clientX, event.clientY));
    });

    sticky.addEventListener('pointerup', commitDragEnd);
    sticky.addEventListener('pointercancel', commitDragEnd);
  });

  wireStickyResize();
}

/* Two-finger resize for stickies — wired once (not per render) on the
   persistent #notebookPage shell. Tracked globally rather than per-sticky
   because real pinch gestures rarely land both fingers within a small
   note's bounds; whichever note the FIRST finger touched is what resizes,
   no matter where the second finger lands. */
function wirePinchResize() {
  const page = document.querySelector('#notebookPage');
  if (!page) return;

  const pointers = new Map();
  let candidateSticky = null;
  let pinchStartDist = 0;
  let pinchStartWidth = 0;

  const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  page.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      candidateSticky = event.target.closest ? event.target.closest('.sticky-loose') : null;
    } else if (pointers.size === 2 && candidateSticky && !activePinchSticky) {
      activePinchSticky = candidateSticky;
      const controller = stickyDragControllers.get(activePinchSticky);
      if (controller) controller.cancelDrag();
      const pts = [...pointers.values()];
      pinchStartDist = Math.max(1, distanceBetween(pts[0], pts[1]));
      pinchStartWidth = activePinchSticky.getBoundingClientRect().width / (state.pageScale || 1);
    }
  });

  page.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!activePinchSticky || pointers.size < 2) return;
    const pts = [...pointers.values()].slice(0, 2);
    const dist = distanceBetween(pts[0], pts[1]);
    const width = Math.max(120, Math.min(420, pinchStartWidth * (dist / pinchStartDist)));
    activePinchSticky.style.setProperty('--w', `${width}px`);
  });

  const endPointer = (event) => {
    pointers.delete(event.pointerId);

    if (activePinchSticky && pointers.size < 2) {
      const data = (currentPage().stickies || []).find((s) => s.id === activePinchSticky.dataset.id);
      if (data) data.width = parseFloat(activePinchSticky.style.getPropertyValue('--w'));
      scheduleSave();
      activePinchSticky = null;
    }
    if (pointers.size === 0) candidateSticky = null;
  };

  page.addEventListener('pointerup', endPointer);
  page.addEventListener('pointercancel', endPointer);
}

function wireStickyResize() {
  const page = document.querySelector('#notebookPage');

  page.querySelectorAll('.resize-handle').forEach((handle) => {
    let resizing = false;
    let startX = 0;
    let startWidth = 0;
    const sticky = handle.closest('.sticky-loose');

    handle.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      resizing = true;
      startX = event.clientX;
      startWidth = sticky.getBoundingClientRect().width;
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener('pointermove', (event) => {
      if (!resizing) return;
      const scale = state.pageScale || 1;
      const width = Math.max(120, Math.min(420, startWidth / scale + (event.clientX - startX) / scale));
      sticky.style.setProperty('--w', `${width}px`);
    });

    const endResize = () => {
      if (!resizing) return;
      resizing = false;
      const data = (currentPage().stickies || []).find((s) => s.id === handle.dataset.resize);
      if (data) data.width = parseFloat(sticky.style.getPropertyValue('--w'));
      scheduleSave();
    };

    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
  });
}

function wireChecklist() {
  document.querySelectorAll('.checklist input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const label = checkbox.closest('label');
      label.style.opacity = checkbox.checked ? '0.5' : '1';
      label.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
    });
  });
}

function wireStickyEditing() {
  const page = document.querySelector('#notebookPage');
  const stickies = currentPage().stickies || [];

  page.querySelectorAll('[data-sticky-title]').forEach((el) => {
    el.addEventListener('blur', () => {
      const item = stickies.find((s) => s.id === el.dataset.stickyTitle);
      if (item) item.title = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-sticky-text]').forEach((el) => {
    el.addEventListener('blur', () => {
      const item = stickies.find((s) => s.id === el.dataset.stickyText);
      if (item) item.text = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-check-text]').forEach((el) => {
    el.addEventListener('blur', () => {
      const [id, i] = el.dataset.checkText.split(':');
      const item = stickies.find((s) => s.id === id);
      if (item && item.checklist) item.checklist[Number(i)] = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-del-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [id, i] = btn.dataset.delCheck.split(':');
      const item = stickies.find((s) => s.id === id);
      if (item && item.checklist) {
        item.checklist.splice(Number(i), 1);
        renderPageContent();
      }
    });
  });

  page.querySelectorAll('[data-add-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = stickies.find((s) => s.id === btn.dataset.addCheck);
      if (item) {
        item.checklist = item.checklist || [];
        item.checklist.push('New item');
        renderPageContent();
      }
    });
  });

  page.querySelectorAll('[data-list-item]').forEach((el) => {
    el.addEventListener('blur', () => {
      const [id, i] = el.dataset.listItem.split(':');
      const item = stickies.find((s) => s.id === id);
      if (item && item.list) item.list[Number(i)] = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-del-list-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [id, i] = btn.dataset.delListItem.split(':');
      const item = stickies.find((s) => s.id === id);
      if (item && item.list) {
        item.list.splice(Number(i), 1);
        renderPageContent();
      }
    });
  });

  page.querySelectorAll('[data-add-list-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = stickies.find((s) => s.id === btn.dataset.addListItem);
      if (item) {
        item.list = item.list || [];
        item.list.push('New item');
        renderPageContent();
      }
    });
  });
}

/* ---------- Page title / date / summary editing ---------- */

function wirePageMeta() {
  const page = currentPage();
  const titleEl = document.querySelector('[data-page-title]');
  const dateEl = document.querySelector('[data-page-date]');
  const copyEl = document.querySelector('[data-page-copy]');

  if (titleEl) titleEl.addEventListener('blur', () => { page.title = titleEl.textContent.trim() || page.title; });
  if (dateEl) dateEl.addEventListener('blur', () => { page.date = dateEl.textContent.trim(); });
  if (copyEl) copyEl.addEventListener('blur', () => { page.copy = copyEl.textContent.trim(); });
}

/* ---------- Blocks (lists / info cards) ---------- */

function wireBlocks() {
  const page = document.querySelector('#notebookPage');
  const blocks = currentPage().blocks || [];

  page.querySelectorAll('[data-block-title]').forEach((el) => {
    el.addEventListener('blur', () => {
      const idx = Number(el.dataset.blockTitle);
      if (blocks[idx]) blocks[idx].title = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-block-item]').forEach((el) => {
    el.addEventListener('blur', () => {
      const [bi, ii] = el.dataset.blockItem.split(':').map(Number);
      if (blocks[bi] && blocks[bi].items) blocks[bi].items[ii] = el.textContent.trim();
    });
  });

  page.querySelectorAll('[data-del-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [bi, ii] = btn.dataset.delItem.split(':').map(Number);
      if (blocks[bi] && blocks[bi].items) {
        blocks[bi].items.splice(ii, 1);
        renderPageContent();
      }
    });
  });

  page.querySelectorAll('[data-add-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.addItem);
      if (blocks[idx]) {
        blocks[idx].items = blocks[idx].items || [];
        blocks[idx].items.push('New point');
        renderPageContent();
      }
    });
  });

  page.querySelectorAll('[data-del-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.delBlock);
      blocks.splice(idx, 1);
      renderPageContent();
    });
  });
}

/* ---------- Add menu (sticky / checklist / text / image) ---------- */

const POPOVER_SELECTORS = ['#addMenu', '#moreMenu', '#brushOptionsMenu', '#pageBgMenu', '#accountMenu'];

function closeAllPopovers(except) {
  POPOVER_SELECTORS.forEach((selector) => {
    if (selector === except) return;
    const el = document.querySelector(selector);
    if (el) el.hidden = true;
  });
}

function addNoteOfType(type, extra = {}) {
  const stickies = currentPage().stickies || (currentPage().stickies = []);
  const x = 22 + Math.random() * 34;
  const y = 22 + Math.random() * 34;
  const id = `s${Date.now()}`;

  if (type === 'checklist') {
    stickies.push({ id, tone: 'pink', x, y, title: 'Checklist', checklist: ['New item'] });
  } else if (type === 'list') {
    stickies.push({ id, tone: 'outline', x, y, title: 'List', list: ['New item'] });
  } else if (type === 'text') {
    stickies.push({ id, tone: 'white', x, y, title: extra.title || 'Note', text: extra.text || 'Type here…' });
  } else if (type === 'image') {
    stickies.push({ id, x, y, width: 200, image: extra.dataUrl, title: 'Image note' });
  } else {
    stickies.push({ id, tone: 'yellow', x, y, title: 'Sticky note', text: 'Type here…' });
  }
  renderPageContent();
  SoundFX.stickyDrop();
}

function wireAddMenu() {
  const btn = document.querySelector('#addNoteButton');
  const menu = document.querySelector('#addMenu');
  const fileInput = document.querySelector('#imageFileInput');

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    menu.hidden = !willOpen;
  });

  menu.querySelectorAll('[data-add-type]').forEach((option) => {
    option.addEventListener('click', () => {
      menu.hidden = true;
      if (option.dataset.addType === 'image') fileInput.click();
      else addNoteOfType(option.dataset.addType);
    });
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addNoteOfType('image', { dataUrl: reader.result });
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  document.addEventListener('click', () => { menu.hidden = true; });
}

/* ---------- Drawing canvas ---------- */

function setupCanvas() {
  const canvas = document.querySelector('#drawCanvas');
  const page = document.querySelector('#notebookPage');
  const ctx = canvas.getContext('2d');
  const pageKey = `${state.notebookId}:${currentPage().id}`;

  function resize() {
    const rect = page.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const stored = state.drawings[pageKey];
    if (stored) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = stored;
    }
  }
  resize();
  canvas.dataset.key = pageKey;
  activeCanvasResize = resize;

  let drawing = false;
  let last = null;
  let points = [];

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function strokeStyleFor(tool) {
    if (tool === 'highlighter') return { color: 'rgba(255, 214, 92, 0.4)', width: 16, comp: 'source-over' };
    if (tool === 'eraser') return { color: 'rgba(0,0,0,1)', width: 22, comp: 'destination-out' };
    return { color: brushState.color, width: brushState.width, comp: 'source-over' };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!['pen', 'highlighter', 'eraser'].includes(state.tool)) return;
    drawing = true;
    last = pointerToCanvas(event);
    points = [last];
    SoundFX.startPenStroke(event.clientX, event.clientY, state.tool);
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    // Fast strokes/touch input coalesce several samples into one pointermove;
    // replaying each one (instead of just the latest) keeps strokes smooth
    // and continuous instead of choppy, closer to real pen/ink behavior.
    const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
    (samples && samples.length ? samples : [event]).forEach((sample) => {
      const point = pointerToCanvas(sample);
      points.push(point);
      const style = strokeStyleFor(state.tool);
      ctx.globalCompositeOperation = style.comp;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Quadratic-curve through the midpoints of the last few points, rather than
      // straight segments — this rounds off the jagged corners of raw pointer
      // samples into a single smooth stroke, closer to natural handwriting.
      if (points.length < 3) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else {
        const p1 = points[points.length - 3];
        const p2 = points[points.length - 2];
        const p3 = points[points.length - 1];
        const start = midpoint(p1, p2);
        const end = midpoint(p2, p3);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(p2.x, p2.y, end.x, end.y);
        ctx.stroke();
      }
      last = point;
      if (points.length > 4) points.shift();
    });
    SoundFX.movePenStroke(event.clientX, event.clientY);
  });

  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    canvas.addEventListener(evt, () => {
      if (drawing) {
        drawing = false;
        points = [];
        SoundFX.endPenStroke();
        pushUndoSnapshot(pageKey, canvas.toDataURL());
      }
    });
  });

  updateCanvasPointerEvents();
}

function updateCanvasPointerEvents() {
  const canvas = document.querySelector('#drawCanvas');
  if (!canvas) return;
  const drawTools = ['pen', 'highlighter', 'eraser'];
  const isDrawing = drawTools.includes(state.tool);
  canvas.style.pointerEvents = isDrawing ? 'auto' : 'none';
  // .page-content sits above the canvas (so text/checkboxes stay clickable
  // normally), but its box covers the whole page — including blank areas —
  // so it must get out of the way while a drawing tool is active, or every
  // pointer event there is swallowed before it ever reaches the canvas.
  const content = document.querySelector('#pageContent');
  if (content) content.style.pointerEvents = isDrawing ? 'none' : '';
}

function pushUndoSnapshot(pageKey, dataUrl) {
  if (!state.undoStacks[pageKey]) state.undoStacks[pageKey] = [];
  state.undoStacks[pageKey].push(dataUrl);
  state.redoStacks[pageKey] = [];
  state.drawings[pageKey] = dataUrl;
  scheduleSave();
}

function saveCanvasSnapshot() {
  const canvas = document.querySelector('#drawCanvas');
  if (!canvas) return;
  const pageKey = canvas.dataset.key;
  if (pageKey) state.drawings[pageKey] = canvas.toDataURL();
}

function wireDrawingTools() {
  // Scoped to buttons with data-tool only — brushOptionsBtn/pageBgBtn share
  // the .tool-btn style but open popovers, they aren't drawing tools.
  const tools = document.querySelectorAll('.tool-btn[data-tool]');
  tools.forEach((tool) => {
    tool.addEventListener('click', () => {
      tools.forEach((item) => item.classList.remove('is-active'));
      tool.classList.add('is-active');
      state.tool = tool.dataset.tool;
      updateCanvasPointerEvents();
      if (window.updateToolCursorAppearance) window.updateToolCursorAppearance();

      if (state.tool === 'sticky') {
        const page = document.querySelector('#notebookPage');
        const handler = (event) => {
          if (event.target.closest('.sticky') || event.target.closest('canvas')) return;
          const rect = page.getBoundingClientRect();
          const xPct = ((event.clientX - rect.left) / rect.width) * 100;
          const yPct = ((event.clientY - rect.top) / rect.height) * 100;
          const stickies = currentPage().stickies || (currentPage().stickies = []);
          stickies.push({ id: `s${Date.now()}`, tone: 'white', x: xPct, y: yPct, title: 'New note', text: 'Tap to edit…' });
          renderPageContent();
          SoundFX.stickyDrop();
          page.removeEventListener('click', handler);
        };
        page.addEventListener('click', handler, { once: true });
      }
    });
  });
}

/* Cozy Floating Tool Cursor Preview
   Shows the exact effective brush, highlighter chisel, or eraser diameter */
function wireToolCursorPreview() {
  const cursor = document.querySelector('#toolCursorPreview');
  const stage = document.querySelector('#pageFlipStage');
  if (!cursor || !stage) return;

  function updateCursorAppearance() {
    cursor.classList.remove('is-pen', 'is-highlighter', 'is-eraser');
    if (!['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      cursor.classList.remove('is-visible');
      return;
    }

    const scale = state.pageScale || 1;
    if (state.tool === 'pen') {
      cursor.classList.add('is-pen');
      const size = Math.max(4, brushState.width * scale);
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
      cursor.style.setProperty('--tool-color', brushState.color);
    } else if (state.tool === 'highlighter') {
      cursor.classList.add('is-highlighter');
      cursor.style.width = `${26 * scale}px`;
      cursor.style.height = `${16 * scale}px`;
    } else if (state.tool === 'eraser') {
      cursor.classList.add('is-eraser');
      const size = 22 * scale;
      cursor.style.width = `${size}px`;
      cursor.style.height = `${size}px`;
    }
  }

  window.updateToolCursorAppearance = updateCursorAppearance;

  stage.addEventListener('pointerenter', () => {
    if (['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      updateCursorAppearance();
      cursor.classList.add('is-visible');
    }
  });

  stage.addEventListener('pointerleave', () => {
    cursor.classList.remove('is-visible');
  });

  stage.addEventListener('pointermove', (event) => {
    if (!['pen', 'highlighter', 'eraser'].includes(state.tool)) {
      cursor.classList.remove('is-visible');
      return;
    }
    cursor.classList.add('is-visible');
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
}

function wireUndoRedo() {
  document.querySelector('#undoButton').addEventListener('click', () => {
    const canvas = document.querySelector('#drawCanvas');
    const pageKey = canvas.dataset.key;
    const stack = state.undoStacks[pageKey];
    if (!stack || !stack.length) return;
    const last = stack.pop();
    state.redoStacks[pageKey] = state.redoStacks[pageKey] || [];
    state.redoStacks[pageKey].push(last);
    const prev = stack[stack.length - 1] || null;
    restoreCanvas(canvas, prev);
    state.drawings[pageKey] = prev;
    scheduleSave();
  });

  document.querySelector('#redoButton').addEventListener('click', () => {
    const canvas = document.querySelector('#drawCanvas');
    const pageKey = canvas.dataset.key;
    const redo = state.redoStacks[pageKey];
    if (!redo || !redo.length) return;
    const dataUrl = redo.pop();
    state.undoStacks[pageKey] = state.undoStacks[pageKey] || [];
    state.undoStacks[pageKey].push(dataUrl);
    restoreCanvas(canvas, dataUrl);
    state.drawings[pageKey] = dataUrl;
    scheduleSave();
  });

  document.querySelector('#clearDrawingButton').addEventListener('click', () => {
    const canvas = document.querySelector('#drawCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageKey = canvas.dataset.key;
    pushUndoSnapshot(pageKey, canvas.toDataURL());
  });
}

function restoreCanvas(canvas, dataUrl) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = dataUrl;
}

/* ---------- Pen writing → text (client-side OCR via Tesseract.js) ---------- */

function canvasHasInk(canvas) {
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) return true;
  }
  return false;
}

function wireConvertPenToText() {
  const btn = document.querySelector('#convertPenToTextBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const canvas = document.querySelector('#drawCanvas');
    if (!canvas) return;

    if (!canvasHasInk(canvas)) {
      openModal(`
        <h3>Nothing to convert</h3>
        <p>Draw with the pen or highlighter first, then try again.</p>
        <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
      `);
      return;
    }

    if (typeof Tesseract === 'undefined') {
      openModal(`
        <h3>Handwriting recognition unavailable</h3>
        <p>Couldn't load the recognition engine. Check your connection and try again.</p>
        <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
      `);
      return;
    }

    btn.disabled = true;
    openModal(`
      <h3>Reading your handwriting…</h3>
      <p>This can take a few seconds — clearer, larger, printed-style writing converts best.</p>
    `);

    try {
      const { data } = await Tesseract.recognize(canvas, 'eng');
      const text = (data.text || '').trim();
      closeModal();

      if (!text) {
        openModal(`
          <h3>Couldn't read anything</h3>
          <p>Try writing bigger and clearer, then convert again.</p>
          <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
        `);
        return;
      }

      openModal(`
        <h3>Convert to text</h3>
        <p>Review and edit the recognized text before adding it as a note.</p>
        <textarea id="ocrResultText" rows="6"></textarea>
        <div class="modal-actions">
          <button class="modal-btn cancel" data-modal-close>Cancel</button>
          <button class="modal-btn confirm" id="insertOcrTextBtn">Insert as note</button>
        </div>
      `, {
        onOpen: (box) => {
          const textarea = box.querySelector('#ocrResultText');
          textarea.value = text;
          textarea.focus();
          box.querySelector('#insertOcrTextBtn').addEventListener('click', () => {
            const finalText = textarea.value.trim();
            if (finalText) addNoteOfType('text', { title: 'Converted note', text: finalText });
            closeModal();
          });
        }
      });
    } catch (err) {
      closeModal();
      openModal(`
        <h3>Something went wrong</h3>
        <p>Couldn't read the handwriting. Please try again.</p>
        <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
      `);
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------- View tabs (Notes / Flashcards / Mind Map / Review) ---------- */

function setView(view) {
  state.view = view;
  document.querySelectorAll('.view-tabs button').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === view));
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.view === view));
  if (view === 'mindmap') renderMindmap();
  if (view === 'notes') requestAnimationFrame(fitPageScale);
}

function wireViewTabs() {
  document.querySelectorAll('.view-tabs button').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  });
}

/* ---------- Flashcards ---------- */

function renderFlashcard() {
  const nb = currentNotebook();
  const cards = nb.flashcards || [];
  const count = document.querySelector('#flashcardCount');
  const card = document.querySelector('#flashcard');
  const front = document.querySelector('#flashcardFront');
  const back = document.querySelector('#flashcardBack');

  if (!cards.length) {
    front.textContent = 'No flashcards in this notebook yet.';
    back.textContent = 'Add some with the button below!';
    front.contentEditable = 'false';
    back.contentEditable = 'false';
    count.textContent = '0 / 0';
    scheduleSave();
    return;
  }

  front.contentEditable = 'true';
  back.contentEditable = 'true';
  const item = cards[state.flashcardIndex];
  front.textContent = item.q;
  back.textContent = item.a;
  count.textContent = `${state.flashcardIndex + 1} / ${cards.length}`;
  card.classList.remove('is-flipped');
  state.flashcardFlipped = false;
  scheduleSave();
}

function wireFlashcards() {
  const card = document.querySelector('#flashcard');
  card.addEventListener('click', (event) => {
    if (event.target.closest('[contenteditable]')) return;
    state.flashcardFlipped = !state.flashcardFlipped;
    card.classList.toggle('is-flipped', state.flashcardFlipped);
  });

  document.querySelector('#prevCardBtn').addEventListener('click', () => {
    const cards = currentNotebook().flashcards || [];
    if (!cards.length) return;
    state.flashcardIndex = (state.flashcardIndex - 1 + cards.length) % cards.length;
    renderFlashcard();
  });

  document.querySelector('#nextCardBtn').addEventListener('click', () => {
    const cards = currentNotebook().flashcards || [];
    if (!cards.length) return;
    state.flashcardIndex = (state.flashcardIndex + 1) % cards.length;
    renderFlashcard();
  });

  document.querySelector('#flashcardFront').addEventListener('blur', (event) => {
    const cards = currentNotebook().flashcards || [];
    if (cards[state.flashcardIndex]) cards[state.flashcardIndex].q = event.target.textContent.trim();
  });

  document.querySelector('#flashcardBack').addEventListener('blur', (event) => {
    const cards = currentNotebook().flashcards || [];
    if (cards[state.flashcardIndex]) cards[state.flashcardIndex].a = event.target.textContent.trim();
  });
}

function wireFlashcardToolbar() {
  document.querySelector('#addCardBtn').addEventListener('click', () => {
    const nb = currentNotebook();
    nb.flashcards = nb.flashcards || [];
    nb.flashcards.push({ q: 'New question', a: 'New answer' });
    state.flashcardIndex = nb.flashcards.length - 1;
    delete state.review[state.notebookId];
    renderFlashcard();
    renderReview();
  });

  document.querySelector('#deleteCardBtn').addEventListener('click', () => {
    const nb = currentNotebook();
    if (!nb.flashcards || !nb.flashcards.length) return;
    nb.flashcards.splice(state.flashcardIndex, 1);
    state.flashcardIndex = Math.max(0, state.flashcardIndex - 1);
    delete state.review[state.notebookId];
    renderFlashcard();
    renderReview();
  });
}

/* ---------- Mind map ---------- */

const MINDMAP_TONES = ['var(--biology)', 'var(--physics)', 'var(--chemistry)', 'var(--maths)', 'var(--personal)'];

/* Every branch can carry its own `children` array, recursively, so ideas
   can fan out into sub-bubbles (and sub-sub-bubbles) off any bubble. */
function getNodeByPath(path) {
  const parts = String(path).split('.').map(Number);
  let node = currentNotebook().mindmap.branches[parts[0]];
  for (let i = 1; i < parts.length; i += 1) {
    if (!node) return null;
    node = (node.children || [])[parts[i]];
  }
  return node || null;
}

function getParentListByPath(path) {
  const parts = String(path).split('.').map(Number);
  let list = currentNotebook().mindmap.branches;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const node = list[parts[i]];
    list = node.children || (node.children = []);
  }
  return { list, index: parts[parts.length - 1] };
}

function shiftDescendants(node, dx, dy) {
  (node.children || []).forEach((child) => {
    child.x = Math.max(3, Math.min(97, child.x + dx));
    child.y = Math.max(3, Math.min(97, child.y + dy));
    shiftDescendants(child, dx, dy);
  });
}

function buildMindmapMarkup(nb) {
  // Use real pixel units so connectors aren't distorted by non-square containers
  const W = 1000, H = 700;
  const cx = W / 2, cy = H / 2;

  let svgLines = '';
  let nodes = `<div class="mindmap-node mindmap-center" contenteditable="true" data-mind-center>${nb.mindmap.center}</div>`;
  let count = 0;

  function bezierPath(x1, y1, x2, y2) {
    // Smooth cubic bezier from parent to child
    const dx = (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  function walk(list, parentX, parentY, prefix, depth, tone) {
    list.forEach((node, i) => {
      count += 1;
      const path = prefix ? `${prefix}.${i}` : `${i}`;
      const nodeTone = depth === 0 ? MINDMAP_TONES[i % MINDMAP_TONES.length] : tone;
      const nx = node.x / 100 * W;
      const ny = node.y / 100 * H;
      const strokeW = depth === 0 ? 2 : 1.2;
      const dashArray = depth > 0 ? 'stroke-dasharray="5 4"' : '';
      svgLines += `<path d="${bezierPath(parentX, parentY, nx, ny)}" stroke="${nodeTone}" stroke-width="${strokeW}" fill="none" ${dashArray} stroke-linecap="round" opacity="${depth === 0 ? 0.7 : 0.45}"/>`;
      nodes += `
        <div class="mindmap-node mindmap-branch depth-${Math.min(depth, 2)}" data-path="${path}" data-depth="${depth}" style="--x:${node.x}%; --y:${node.y}%; --tone:${nodeTone}; animation-delay:${Math.min(count * 0.04, 0.5)}s">
          <span contenteditable="true" data-mind-label="${path}">${node.label}</span>
          <button class="mindmap-node-add" data-mind-add="${path}" aria-label="Add sub-bubble" title="Add sub-bubble">+</button>
          <button class="mindmap-node-delete" data-mind-del="${path}" aria-label="Remove bubble" title="Remove">×</button>
        </div>
      `;
      if (node.children && node.children.length) {
        walk(node.children, nx, ny, path, depth + 1, nodeTone);
      }
    });
  }

  walk(nb.mindmap.branches, cx, cy, '', 0, null);

  return {
    svg: `<svg class="mindmap-lines" id="mindmapLines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${svgLines}</svg>`,
    nodes: nodes + (nb.mindmap.branches.length === 0 ? '<p class="mindmap-empty">Double-click anywhere, or tap +, to add your first idea.</p>' : '')
  };
}

function renderMindmap() {
  const nb = currentNotebook();
  const canvas = document.querySelector('#mindmapCanvas');
  const markup = buildMindmapMarkup(nb);
  canvas.innerHTML = markup.svg + markup.nodes;
  wireMindmapInteractions();
  scheduleSave();
}

function updateMindmapLines() {
  const nb = currentNotebook();
  const lines = document.querySelector('#mindmapLines');
  if (!lines) return;
  lines.outerHTML = buildMindmapMarkup(nb).svg;
}

function addMindmapNode(x, y) {
  currentNotebook().mindmap.branches.push({ label: 'New idea', x, y, children: [] });
  renderMindmap();
}

function addMindmapChild(path) {
  const parent = getNodeByPath(path);
  if (!parent) return;
  if (!parent.children) parent.children = [];
  const angle = Math.random() * Math.PI * 2;
  const dist = 13 + Math.random() * 5;
  const x = Math.max(3, Math.min(97, parent.x + Math.cos(angle) * dist));
  const y = Math.max(3, Math.min(97, parent.y + Math.sin(angle) * dist));
  parent.children.push({ label: 'Sub-idea', x, y, children: [] });
  renderMindmap();
}

function wireMindmapInteractions() {
  const canvas = document.querySelector('#mindmapCanvas');
  const nb = currentNotebook();

  const centerEl = canvas.querySelector('[data-mind-center]');
  if (centerEl) {
    centerEl.addEventListener('blur', () => { nb.mindmap.center = centerEl.textContent.trim() || nb.mindmap.center; });
  }

  canvas.querySelectorAll('[data-mind-label]').forEach((el) => {
    el.addEventListener('blur', () => {
      const node = getNodeByPath(el.dataset.mindLabel);
      if (node) node.label = el.textContent.trim() || node.label;
    });
  });

  canvas.querySelectorAll('[data-mind-add]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      addMindmapChild(btn.dataset.mindAdd);
    });
  });

  canvas.querySelectorAll('[data-mind-del]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const { list, index } = getParentListByPath(btn.dataset.mindDel);
      list.splice(index, 1);
      renderMindmap();
    });
  });

  canvas.querySelectorAll('.mindmap-branch').forEach((node) => {
    let dragging = false;
    let pendingStart = null;
    let offsetX = 0;
    let offsetY = 0;
    const DRAG_THRESHOLD = 6;

    const beginDrag = (clientX, clientY, pointerId) => {
      dragging = true;
      node.classList.add('is-dragging');
      node.setPointerCapture(pointerId);
      if (document.activeElement && node.contains(document.activeElement)) document.activeElement.blur();
      const rect = canvas.getBoundingClientRect();
      const branch = getNodeByPath(node.dataset.path);
      offsetX = clientX - rect.left - (branch.x / 100) * rect.width;
      offsetY = clientY - rect.top - (branch.y / 100) * rect.height;
    };

    node.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      pendingStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    });

    node.addEventListener('pointermove', (event) => {
      if (!pendingStart || pendingStart.pointerId !== event.pointerId) return;
      if (!dragging) {
        const dx0 = event.clientX - pendingStart.x;
        const dy0 = event.clientY - pendingStart.y;
        if (Math.hypot(dx0, dy0) < DRAG_THRESHOLD) return;
        beginDrag(pendingStart.x, pendingStart.y, event.pointerId);
      }
      const rect = canvas.getBoundingClientRect();
      const xPct = Math.max(3, Math.min(97, ((event.clientX - rect.left - offsetX) / rect.width) * 100));
      const yPct = Math.max(3, Math.min(97, ((event.clientY - rect.top - offsetY) / rect.height) * 100));
      const branch = getNodeByPath(node.dataset.path);
      const dx = xPct - branch.x;
      const dy = yPct - branch.y;
      node.style.setProperty('--x', `${xPct}%`);
      node.style.setProperty('--y', `${yPct}%`);
      branch.x = xPct;
      branch.y = yPct;
      shiftDescendants(branch, dx, dy);
      updateMindmapLines();
    });

    const endDrag = () => {
      pendingStart = null;
      if (!dragging) return;
      dragging = false;
      node.classList.remove('is-dragging');
      scheduleSave();
    };
    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', endDrag);
  });
}

function wireMindmapAdd() {
  document.querySelector('#addMindNodeButton').addEventListener('click', () => {
    addMindmapNode(30 + Math.random() * 40, 30 + Math.random() * 40);
  });

  document.querySelector('#mindmapCanvas').addEventListener('dblclick', (event) => {
    if (event.target.closest('.mindmap-node')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(4, Math.min(96, ((event.clientY - rect.top) / rect.height) * 100));
    addMindmapNode(xPct, yPct);
  });

  document.querySelector('#arrangeMindmapButton').addEventListener('click', () => {
    const branches = currentNotebook().mindmap.branches;
    const total = branches.length;
    if (!total) return;
    branches.forEach((branch, i) => {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      const newX = 50 + 38 * Math.cos(angle);
      const newY = 50 + 38 * Math.sin(angle);
      shiftDescendants(branch, newX - branch.x, newY - branch.y);
      branch.x = newX;
      branch.y = newY;
    });
    renderMindmap();
  });
}


/* ---------- Review ---------- */

function reviewItemsFor(id) {
  if (!state.review[id]) {
    state.review[id] = (notebooks[id].flashcards || []).map((card, index) => ({ ...card, mastered: false, key: `${id}-${index}` }));
  }
  return state.review[id];
}

function renderReview() {
  const items = reviewItemsFor(state.notebookId);
  const list = document.querySelector('#reviewList');
  const nb = currentNotebook();

  updateReviewFilterCounts(items);

  if (!items.length) {
    list.innerHTML = '<p class="empty-review">No review items yet — add flashcards to this notebook first.</p>';
    updateReviewProgress();
    return;
  }

  const filtered = items.filter((item) => {
    if (state.reviewFilter === 'due') return !item.mastered;
    if (state.reviewFilter === 'mastered') return item.mastered;
    return true;
  });

  const dueCount = items.filter((item) => !item.mastered).length;
  const celebrate = (state.reviewFilter !== 'mastered' && dueCount === 0)
    ? '<p class="review-celebrate">🎉 All caught up — everything in this notebook is mastered!</p>'
    : '';

  if (!filtered.length) {
    list.innerHTML = celebrate || `<p class="empty-review">Nothing in "${state.reviewFilter}" right now.</p>`;
    updateReviewProgress();
    return;
  }

  list.innerHTML = celebrate + filtered.map((item) => {
    const revealed = state.revealed.has(item.key);
    return `
      <article class="review-card${item.mastered ? ' is-mastered' : ''}${revealed ? ' is-revealed' : ''}" data-key="${item.key}" style="--accent: var(--${nb.color})">
        <span class="review-tag">${item.mastered ? 'Mastered' : 'Due'}</span>
        <p class="review-q">${item.q}</p>
        ${revealed ? `
          <p class="review-a">${item.a}</p>
          <div class="review-actions">
            <button class="review-btn review-again" data-key="${item.key}">Review again</button>
            <button class="review-btn review-got-it" data-key="${item.key}">Got it ✓</button>
          </div>
        ` : `
          <button class="review-reveal" data-key="${item.key}">Show answer</button>
        `}
      </article>
    `;
  }).join('');

  list.querySelectorAll('.review-reveal').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.revealed.add(btn.dataset.key);
      renderReview();
    });
  });
  list.querySelectorAll('.review-got-it').forEach((btn) => {
    btn.addEventListener('click', () => setMastered(btn.dataset.key, true));
  });
  list.querySelectorAll('.review-again').forEach((btn) => {
    btn.addEventListener('click', () => setMastered(btn.dataset.key, false));
  });

  updateReviewProgress();
}

function setMastered(key, mastered) {
  const items = reviewItemsFor(state.notebookId);
  const item = items.find((i) => i.key === key);
  if (item) item.mastered = mastered;
  state.revealed.delete(key);
  renderReview();
}

function shuffleReview() {
  const items = reviewItemsFor(state.notebookId);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  renderReview();
}

function resetReviewProgress() {
  const items = reviewItemsFor(state.notebookId);
  items.forEach((item) => { item.mastered = false; });
  state.revealed.clear();
  renderReview();
}

function wireReviewToolbar() {
  document.querySelector('#shuffleReviewBtn').addEventListener('click', shuffleReview);
  document.querySelector('#resetReviewBtn').addEventListener('click', resetReviewProgress);
}

function wireReviewFilters() {
  document.querySelectorAll('.review-filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.reviewFilter = tab.dataset.filter;
      document.querySelectorAll('.review-filter-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      renderReview();
    });
  });
}

function updateReviewFilterCounts(items) {
  const counts = {
    all: items.length,
    due: items.filter((i) => !i.mastered).length,
    mastered: items.filter((i) => i.mastered).length
  };
  document.querySelectorAll('.review-filter-tab').forEach((tab) => {
    const key = tab.dataset.filter;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    tab.textContent = `${label} (${counts[key] || 0})`;
  });
}

function updateReviewProgress() {
  const items = reviewItemsFor(state.notebookId);
  const mastered = items.filter((i) => i.mastered).length;
  const percent = items.length ? Math.round((mastered / items.length) * 100) : 0;
  document.querySelector('#reviewMastered').textContent = mastered;
  document.querySelector('#reviewDue').textContent = items.length - mastered;
  const ring = document.querySelector('#reviewRing');
  if (ring) {
    ring.style.setProperty('--pct', percent);
    document.querySelector('#reviewRingLabel').textContent = `${percent}%`;
  }
  scheduleSave();
}

/* ---------- Toolbar: search, share, more, new notebook ---------- */

/* ---------- Modal (replaces prompt()/confirm() with a cozy dialog) ---------- */

function openModal(html, { onOpen } = {}) {
  const overlay = document.querySelector('#modalOverlay');
  const box = document.querySelector('#modalBox');
  box.innerHTML = html;
  overlay.hidden = false;

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  }, { once: true });

  box.querySelectorAll('[data-modal-close]').forEach((btn) => btn.addEventListener('click', closeModal));
  if (onOpen) onOpen(box);
}

function closeModal() {
  const overlay = document.querySelector('#modalOverlay');
  overlay.hidden = true;
  document.querySelector('#modalBox').innerHTML = '';
}

/* ---------- Toolbar: search, share, more, new notebook ---------- */

function wireSearch() {
  const wrap = document.querySelector('#searchWrap');
  const field = document.querySelector('#searchField');
  const input = document.querySelector('#searchInput');
  const results = document.querySelector('#searchResults');
  // .toolbar has overflow:hidden — move the results dropdown to <body> and
  // position it via computed coordinates so it isn't silently clipped.
  document.body.appendChild(results);

  function positionResults() {
    const rect = field.getBoundingClientRect();
    results.style.position = 'fixed';
    results.style.top = `${rect.bottom + 8}px`;
    results.style.left = 'auto';
    results.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    results.style.zIndex = '40';
  }

  field.querySelector('svg').addEventListener('click', () => {
    field.classList.toggle('is-open');
    if (field.classList.contains('is-open')) input.focus();
    else results.hidden = true;
  });

  function renderResults() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.hidden = true;
      return;
    }
    const nb = currentNotebook();
    const matches = nb.pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => page.title.toLowerCase().includes(query) || page.copy.toLowerCase().includes(query));

    results.innerHTML = matches.length
      ? matches.map(({ page, index }) => `
          <button class="search-result" data-index="${index}">
            <strong>${page.title}</strong>
            <span>${page.copy}</span>
          </button>
        `).join('')
      : '<p class="search-empty">No matching pages in this notebook.</p>';

    results.querySelectorAll('.search-result').forEach((btn) => {
      btn.addEventListener('click', () => {
        setView('notes');
        goToPage(Number(btn.dataset.index));
        results.hidden = true;
        input.value = '';
      });
    });
    results.hidden = false;
    positionResults();
  }

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', () => { if (input.value.trim()) renderResults(); });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target) && !results.contains(event.target)) results.hidden = true;
  });
}

/* Notebook Dropdown — clicking the "Biology Notes" pill in the top-left
   opens a compact popover listing all notebooks to switch between */
function wireNotebookDropdown() {
  const btn = document.querySelector('#notebookDropdown');
  if (!btn) return;

  // Create a lightweight popover attached to body
  const popover = document.createElement('div');
  popover.id = 'notebookSwitcherMenu';
  popover.className = 'dropdown-menu notebook-switcher-menu';
  popover.hidden = true;
  document.body.appendChild(popover);

  function renderSwitcherList() {
    popover.innerHTML = Object.entries(notebooks).map(([id, nb]) => `
      <button class="nb-switch-item${id === state.notebookId ? ' is-active' : ''}" data-id="${id}">
        <span class="dot dot-${nb.color}"></span>
        <span>${nb.label}</span>
      </button>
    `).join('');

    popover.querySelectorAll('.nb-switch-item').forEach((item) => {
      item.addEventListener('click', () => {
        switchNotebook(item.dataset.id);
        popover.hidden = true;
      });
    });
  }

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!popover.hidden) {
      popover.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      return;
    }
    renderSwitcherList();
    popover.hidden = false;
    btn.setAttribute('aria-expanded', 'true');

    // Position below the pill button
    const rect = btn.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top = `${rect.bottom + 6}px`;
    popover.style.left = `${rect.left}px`;
    popover.style.right = 'auto';
    popover.style.bottom = 'auto';
    popover.style.zIndex = '60';
    popover.style.minWidth = `${Math.max(rect.width, 160)}px`;
  });

  popover.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => {
    popover.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
}

function wireMenus() {
  const shareBtn = document.querySelector('#shareBtn');
  const shareToast = document.querySelector('#shareToast');
  shareBtn.addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}#${state.notebookId}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const temp = document.createElement('textarea');
        temp.value = link;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
    } catch (err) {
      /* clipboard denied — toast still confirms the intent to the user */
    }
    shareToast.hidden = false;
    setTimeout(() => { shareToast.hidden = true; }, 1800);
  });

  const moreBtn = document.querySelector('#moreBtn');
  const moreMenu = document.querySelector('#moreMenu');
  document.body.appendChild(moreMenu);
  moreBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = moreMenu.hidden;
    closeAllPopovers();
    if (willOpen) openBelowPopover(moreBtn, moreMenu);
    else moreMenu.hidden = true;
  });
  document.addEventListener('click', () => { moreMenu.hidden = true; });

  document.querySelector('#renameNotebookBtn').addEventListener('click', () => {
    openModal(`
      <h3>Rename notebook</h3>
      <input type="text" id="renameInput" value="${currentNotebook().label}">
      <div class="modal-actions">
        <button class="modal-btn cancel" data-modal-close>Cancel</button>
        <button class="modal-btn confirm" id="saveRenameBtn">Save</button>
      </div>
    `, {
      onOpen: (box) => {
        const input = box.querySelector('#renameInput');
        input.focus();
        input.select();
        const save = () => {
          const name = input.value.trim();
          if (!name) return;
          currentNotebook().label = name;
          renderNotebookList();
          document.querySelector('#dropdownLabel').textContent = `${name} Notes`;
          closeModal();
        };
        box.querySelector('#saveRenameBtn').addEventListener('click', save);
        input.addEventListener('keydown', (event) => { if (event.key === 'Enter') save(); });
      }
    });
  });

  document.querySelector('#duplicatePageBtn').addEventListener('click', () => {
    const nb = currentNotebook();
    const copy = JSON.parse(JSON.stringify(currentPage()));
    copy.id = `${copy.id}-copy${Date.now()}`;
    copy.tab = `${copy.tab} copy`;
    nb.pages.splice(state.pageIndex + 1, 0, copy);
    goToPage(state.pageIndex + 1);
  });

  document.querySelector('#deletePageBtn').addEventListener('click', () => {
    requestDeletePage(state.pageIndex);
  });

  document.querySelector('#deleteNotebookBtn').addEventListener('click', () => {
    requestDeleteNotebook(state.notebookId);
  });

  wireExportImport();
}

/* ---------- Export / Import (a portable, cross-device "account") ---------- */
/* There's no backend here, so a real cloud account isn't possible from a
   static page — export/import is the honest equivalent: a single .json
   file with every notebook, page, drawing and review status, that can be
   re-imported on any browser or device to pick up exactly where you left off. */
function wireExportImport() {
  document.querySelector('#exportNotesBtn').addEventListener('click', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      notebooks,
      recents: state.recents,
      notebookId: state.notebookId,
      pageIndex: state.pageIndex,
      drawings: state.drawings,
      review: state.review
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = payload.exportedAt.slice(0, 10);
    link.href = url;
    link.download = `drift-notes-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  const fileInput = document.querySelector('#importFileInput');
  document.querySelector('#importNotesBtn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        openModal(`
          <h3>Couldn't read that file</h3>
          <p>It doesn't look like a valid Drift export (.json).</p>
          <div class="modal-actions">
            <button class="modal-btn confirm" data-modal-close>OK</button>
          </div>
        `);
        return;
      }
      if (!data || typeof data !== 'object' || !data.notebooks) {
        openModal(`
          <h3>Couldn't read that file</h3>
          <p>It doesn't look like a valid Drift export (.json).</p>
          <div class="modal-actions">
            <button class="modal-btn confirm" data-modal-close>OK</button>
          </div>
        `);
        return;
      }

      openModal(`
        <h3>Import notes?</h3>
        <p>This replaces everything currently in Drift on this device with the ${Object.keys(data.notebooks).length} notebook${Object.keys(data.notebooks).length === 1 ? '' : 's'} from this file. This can't be undone.</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" data-modal-close>Cancel</button>
          <button class="modal-btn confirm" id="confirmImportBtn">Import</button>
        </div>
      `, {
        onOpen: (box) => {
          box.querySelector('#confirmImportBtn').addEventListener('click', () => {
            Object.keys(notebooks).forEach((key) => delete notebooks[key]);
            Object.assign(notebooks, data.notebooks);
            state.recents = Array.isArray(data.recents) ? data.recents : Object.keys(notebooks);
            state.notebookId = (data.notebookId && notebooks[data.notebookId]) ? data.notebookId : Object.keys(notebooks)[0];
            state.pageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
            state.drawings = (data.drawings && typeof data.drawings === 'object') ? data.drawings : {};
            state.review = (data.review && typeof data.review === 'object') ? data.review : {};
            state.revealed = new Set();
            const importedPageCount = (notebooks[state.notebookId].pages || []).length;
            if (state.pageIndex >= importedPageCount) state.pageIndex = Math.max(0, importedPageCount - 1);
            saveState();
            closeModal();

            const nb = notebooks[state.notebookId];
            document.querySelector('#dropdownDot').className = `dot dot-${nb.color}`;
            document.querySelector('#dropdownLabel').textContent = `${nb.label} Notes`;
            renderNotebookList();
            renderPageTabs();
            renderPage();
            renderFlashcard();
            renderMindmap();
            renderReview();
          });
        }
      });
    };
    reader.readAsText(file);
  });
}

/* ---------- Import PDF / Word / TXT / MD as new pages ---------- */

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function textToPageCopyHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

/* Keeps each imported page a readable length by splitting on paragraph
   breaks rather than mid-sentence, so long documents become several
   normal-sized pages instead of one giant wall of text. */
function chunkText(text, maxLen = 1200) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  paragraphs.forEach((p) => {
    if (current && (current.length + p.length + 2) > maxLen) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  });
  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text.trim()];
}

function smartFormatText(text) {
  let out = text;
  
  // Clean up strange PDF spacing
  out = out.replace(/[ \t]+/g, ' ');

  // Aggressively break sentences if it's a wall of text (few newlines)
  if (out.split('\n').length < (out.length / 100)) {
     out = out.replace(/([a-z]{2,}[.?!])\s+([A-Z])/g, '$1\n\n$2');
  }

  // 1. Force headers for numbered sections (e.g., "1. Introduction" or "2. Main Organs")
  // Allows matching even if it's inline, by forcing a break before it
  out = out.replace(/(?:^|\n|\s+)(\d+(?:\.\d+)*\.\s+[A-Z][^.!?:]{2,60})(?:\s|$)/g, '\n\n# $1\n\n');
  
  // 2. Definitions: "Mouth: Digestion begins" -> "- **Mouth:** Digestion begins"
  // Allows matching inline after a sentence or space
  out = out.replace(/(?:^|\n|\s+)([A-Z][a-zA-Z\s-]{2,30}):\s+/g, '\n\n- **$1:** ');

  // 3. Ensure standard markdown bullets get their own lines
  out = out.replace(/(?:^|\n|\s+)([-*]\s+[A-Z])/g, '\n\n$1');

  // 4. Clean up multiple empty lines
  out = out.replace(/\n{3,}/g, '\n\n');
  
  return out.trim();
}

async function extractPdfText(file) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF_ENGINE_UNAVAILABLE');
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY = -1;
    let pageText = '';
    content.items.forEach((item) => {
      // If Y coordinate changes by more than 4px, it's a new line
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 4) {
        pageText += '\n';
      } else if (lastY !== -1) {
        pageText += ' '; // Same line spacing
      }
      pageText += item.str;
      lastY = item.transform[5];
    });
    text += pageText + '\n\n';
  }
  return text;
}

async function extractDocxText(file) {
  if (typeof mammoth === 'undefined') throw new Error('DOCX_ENGINE_UNAVAILABLE');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

// ── Parses formatted text into logical sections, each becoming a page ──
function parseIntoSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = { heading: '', lines: [] };

  lines.forEach((line) => {
    const trimmed = line.trim();
    // H1: # Title  →  major section break
    const h1 = trimmed.match(/^#{1,2}\s+(.+)$/);
    if (h1) {
      if (current.lines.filter(l => l.trim()).length > 0) sections.push(current);
      current = { heading: h1[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  });
  if (current.lines.filter(l => l.trim()).length > 0 || current.heading) {
    sections.push(current);
  }
  return sections;
}

function insertImportedTextAsPages(filename, text) {
  const nb = currentNotebook();
  const tones = ['yellow', 'blue', 'pink', 'white', 'outline'];
  
  // Step 1: Apply AI formatter
  const formatted = smartFormatText(text);
  
  // Step 2: Parse into logical sections (each section = one page)
  const sections = parseIntoSections(formatted);
  
  // Derive document title from filename
  const docTitle = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const firstIndex = nb.pages.length;
  
  // Collections for auto-generated flashcards and mindmap
  const generatedFlashcards = [];
  const mindmapBranches = [];
  
  // Step 3: Build a page for each section
  const chunkedSections = [];
  // Chunk each section into sub-pages if very long
  sections.forEach((section) => {
    const body = section.lines.join('\n');
    const paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    const MAX_PARAS = 6;
    if (paragraphs.length <= MAX_PARAS) {
      chunkedSections.push(section);
    } else {
      // Split into sub-pages preserving the heading on the first
      for (let i = 0; i < paragraphs.length; i += MAX_PARAS) {
        const slice = paragraphs.slice(i, i + MAX_PARAS);
        const label = i === 0 ? section.heading : section.heading ? `${section.heading} (cont'd)` : '';
        chunkedSections.push({ heading: label, lines: slice.join('\n\n').split('\n') });
      }
    }
  });

  const totalPages = chunkedSections.length || 1;
  
  chunkedSections.forEach((section, idx) => {
    const sectionLines = section.lines;
    let copyHTML = '';
    const blocks = [];
    const stickies = [];
    let currentList = null;
    let nextBlockTitle = null;
    let keyTermFound = null; // for flashcard capture

    // Determine page tab label — clean section heading, no appended numbers
    const sectionHeading = section.heading
      ? section.heading.replace(/^\d+[.)]\s*/, '').trim()
      : docTitle;
    // Tab: use the section heading directly, truncated for display
    const tab = sectionHeading.slice(0, 28);

    // Build mind map: each top-level section heading becomes a branch radiating from center
    if (section.heading && idx < 12) {
      const totalBranches = Math.min(chunkedSections.filter(s => s.heading).length, 12);
      // Start from top (-90°) and distribute evenly, skipping a gap at the bottom
      const startAngle = -90;
      const spreadAngle = totalBranches <= 1 ? 0 : 330; // leave a 30° gap at bottom
      const angle = startAngle + (idx / Math.max(totalBranches - 1, 1)) * spreadAngle;
      const rad = angle * Math.PI / 180;
      const r = 36;
      mindmapBranches.push({
        label: section.heading.replace(/^\d+[.)]\s*/, '').slice(0, 40),
        x: Math.round(50 + r * Math.cos(rad)),
        y: Math.round(50 + r * Math.sin(rad)),
        children: []
      });
    }

    sectionLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (copyHTML && !copyHTML.endsWith('<br><br>')) copyHTML += '<br><br>';
        currentList = null;
        return;
      }

      // Blockquotes / Note: lines → floating sticky
      if (trimmed.startsWith('> ') || /^note:/i.test(trimmed)) {
        currentList = null;
        const sTone = tones[stickies.length % tones.length];
        stickies.push({
          id: `s_imp_${Date.now()}_${stickies.length}`,
          tone: sTone,
          x: 58 + (stickies.length % 3) * 8 + Math.random() * 4,
          y: 12 + (stickies.length * 22) % 60 + Math.random() * 6,
          title: /^note:/i.test(trimmed) ? 'Note' : 'Highlight',
          text: trimmed.replace(/^(> |Note:\s*)/i, '')
        });
        return;
      }

      // Markdown H1/H2 headings
      if (trimmed.startsWith('#')) {
        currentList = null;
        const headingLevel = (trimmed.match(/^#+/) || [''])[0].length;
        const headerText = escapeHtml(trimmed.replace(/^#+\s*/, ''));
        nextBlockTitle = headerText;
        const fontSize = headingLevel === 1 ? '1.2em' : '1.05em';
        const marginTop = headingLevel === 1 ? '22px' : '14px';
        copyHTML += `<span style="display:block; font-size:${fontSize}; font-weight:700; color:var(--ink); margin-top:${marginTop}; margin-bottom:4px; border-bottom:1px solid rgba(0,0,0,0.08); padding-bottom:3px;">${headerText}</span>`;
        return;
      }

      // Bullet / definition items → structured blocks
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      // Only treat short (< 180 chars) numbered lines as list items
      const isShortNumbered = /^\d+[.)]\s/.test(trimmed) && trimmed.length < 180;

      if (isBullet || isShortNumbered) {
        if (!currentList) {
          // Derive a meaningful title: prefer the preceding header, then the section name, then a fallback
          let blockTitle = nextBlockTitle;
          if (!blockTitle) {
            if (blocks.length === 0) {
              blockTitle = sectionHeading || 'Key Points';
            } else {
              // Use first word(s) of first item as title hint
              blockTitle = sectionHeading ? `${sectionHeading} – Notes` : 'Points';
            }
          }
          nextBlockTitle = null;
          const bTone = tones[blocks.length % tones.length];
          currentList = {
            type: blocks.length % 2 === 0 ? 'list' : 'sticky',
            tone: bTone,
            title: blockTitle,
            items: []
          };
          blocks.push(currentList);
        }
        // Strip leading bullet markers, numbered prefixes, AND all ** markdown bold syntax
        let itemText = trimmed
          .replace(/^[-*]\s+/, '')
          .replace(/^\d+[.)]\s+/, '')
          .replace(/\*\*(.+?)\*\*/g, '$1');  // **bold** → bold (everywhere in the string)
        
        currentList.items.push(itemText);

        // Extract flashcard: definition-style items "Term: explanation"
        const defMatch = itemText.match(/^([^:]{2,40}):\s+(.{10,})/);
        if (defMatch && generatedFlashcards.length < 20) {
          generatedFlashcards.push({ q: `What is ${defMatch[1].trim()}?`, a: defMatch[2].trim() });
        }
        // Also add as sub-branch to current mind map branch
        // Orbit children around the parent branch position
        if (mindmapBranches.length > 0) {
          const parentBranch = mindmapBranches[mindmapBranches.length - 1];
          const childIdx = parentBranch.children.length;
          const childCount = 4;
          const childLabel = itemText.split(':')[0].slice(0, 30);
          // Spread children radially outward from the parent direction
          const pAngle = Math.atan2(parentBranch.y - 50, parentBranch.x - 50);
          const spread = Math.PI / 3;
          const childAngle = pAngle - spread / 2 + (childIdx / Math.max(childCount - 1, 1)) * spread;
          const cr = 18;
          const cx2 = Math.round(Math.max(5, Math.min(95, parentBranch.x + cr * Math.cos(childAngle))));
          const cy2 = Math.round(Math.max(5, Math.min(95, parentBranch.y + cr * Math.sin(childAngle))));
          if (childIdx < childCount) {
            parentBranch.children.push({ label: childLabel, x: cx2, y: cy2, children: [] });
          }
        }
      } else {
        // Regular paragraph: close list, write to copy
        if (currentList && currentList.items.length > 0) {
          // Continuation — append to last item if short
          if (trimmed.length < 120) {
            currentList.items[currentList.items.length - 1] += ' ' + trimmed;
            return;
          }
        }
        currentList = null;
        nextBlockTitle = null;
        // Render **bold** as <strong> in paragraph text
        const paraHtml = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        copyHTML += paraHtml + '<br>';
      }
    });

    // Determine a clean, relevant page title
    const cleanHeading = section.heading
      ? section.heading.replace(/^\d+[.)]\s*/, '').trim()
      : (idx === 0 ? docTitle : `${docTitle} (cont'd)`);

    nb.pages.push({
      id: `import${Date.now()}${idx}`,
      tab: tab.replace(/_/g, ' '),
      title: cleanHeading || docTitle,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      copy: copyHTML.replace(/(<br>)+$/, ''),
      blocks,
      stickies
    });
  });

  // Step 4: Inject auto-generated flashcards
  if (generatedFlashcards.length > 0) {
    nb.flashcards = (nb.flashcards || []).concat(generatedFlashcards);
    // Reset review cache so new cards appear
    delete state.review[state.notebookId];
    state.flashcardIndex = 0;
    renderFlashcard();
  }

  // Step 5: Inject auto-generated mind map if it doesn't already have branches
  if (mindmapBranches.length > 0 && (nb.mindmap.branches || []).length === 0) {
    nb.mindmap = { center: docTitle, branches: mindmapBranches };
    renderMindmap();
  }

  renderPageTabs();
  goToPage(firstIndex, 'next');
}

async function importFileAsNotes(file) {
  const name = file.name || 'Imported file';
  const ext = (name.split('.').pop() || '').toLowerCase();

  openModal(`
    <h3>Importing "${escapeHtml(name)}"…</h3>
    <p>Extracting text — this may take a moment for large files.</p>
  `);

  try {
    let text = '';
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
      text = await file.text();
    } else if (ext === 'pdf') {
      text = await extractPdfText(file);
    } else if (ext === 'docx') {
      text = await extractDocxText(file);
    } else if (ext === 'doc') {
      throw new Error('DOC_UNSUPPORTED');
    } else {
      throw new Error('UNSUPPORTED_TYPE');
    }

    closeModal();
    text = (text || '').trim();
    if (!text) {
      openModal(`
        <h3>Nothing to import</h3>
        <p>Couldn't find any readable text in that file.</p>
        <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
      `);
      return;
    }
    insertImportedTextAsPages(name, text);
  } catch (err) {
    closeModal();
    const message = err && err.message === 'DOC_UNSUPPORTED'
      ? "Old .doc files aren't supported in the browser — save it as .docx and try again."
      : err && err.message === 'UNSUPPORTED_TYPE'
        ? 'Only PDF, Word (.docx), .txt, and .md files can be imported.'
        : "Couldn't read that file. Please try again.";
    openModal(`
      <h3>Import failed</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
    `);
  }
}

function wireFileToNotesImport() {
  const btn = document.querySelector('#importFileToNotesBtn');
  const quickBtn = document.querySelector('#quickImportBtn');
  const fileInput = document.querySelector('#fileToNotesInput');
  if (!fileInput) return;

  if (btn) btn.addEventListener('click', () => fileInput.click());
  if (quickBtn) quickBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (file) importFileAsNotes(file);
  });
}

function wireDragAndDropImport() {
  const dropzone = document.querySelector('#fileDropzone');
  if (!dropzone) return;

  let dragTimer;
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    const types = e.dataTransfer.types;
    if (types && types.includes('Files')) {
      dropzone.hidden = false;
      clearTimeout(dragTimer);
    }
  });

  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    clearTimeout(dragTimer);
    dragTimer = setTimeout(() => {
      dropzone.hidden = true;
    }, 100);
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.hidden = true;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileForReadingPane(e.dataTransfer.files[0]);
    }
  });
}

async function handleFileForReadingPane(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  
  if (ext === 'pdf') {
    openModal('<h3>Reading PDF...</h3><p>Extracting text from PDF.</p>');
    try {
      const text = await extractPdfText(file);
      closeModal();
      openReadingPane(file.name, smartFormatText(text));
    } catch (e) {
      closeModal();
      openModal('<h3>PDF Error</h3><p>Could not extract text from this PDF.</p><div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>');
    }
    return;
  }
  
  if (!['txt', 'md', 'markdown'].includes(ext)) {
    openModal(`
      <h3>Unsupported file type</h3>
      <p>Only .txt, .md, and .pdf files are supported for the reading pane currently.</p>
      <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
    `);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    openReadingPane(file.name, smartFormatText(e.target.result));
  };
  reader.readAsText(file);
}

function openReadingPane(title, text) {
  const pane = document.querySelector('#readingPane');
  const titleEl = document.querySelector('#readingPaneTitle');
  const contentEl = document.querySelector('#readingPaneContent');
  
  if (!pane || !titleEl || !contentEl) return;
  
  titleEl.textContent = title.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  
  // Full markdown-lite renderer
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Headings
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Bullet list items → wrap consecutive ones in <ul>
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)(?=\n(?!<li>)|$)/g, '<ul>$1</ul>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  
  contentEl.innerHTML = html;
  pane.hidden = false;
  
  window.dispatchEvent(new Event('resize'));
}

function wireReadingPaneExtraction() {
  const contentEl = document.querySelector('#readingPaneContent');
  const btn = document.querySelector('#extractToNoteBtn');
  const closeBtn = document.querySelector('#closeReadingPaneBtn');
  const pane = document.querySelector('#readingPane');
  
  if (closeBtn && pane) {
    closeBtn.addEventListener('click', () => {
      pane.hidden = true;
      window.dispatchEvent(new Event('resize'));
    });
  }
  
  if (!contentEl || !btn) return;

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      btn.hidden = true;
      return;
    }

    if (contentEl.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Ensure the button isn't off-screen to the left
      btn.style.left = `${Math.max(10, rect.right + 10)}px`;
      btn.style.top = `${Math.max(10, rect.top - 40)}px`;
      btn.hidden = false;
    } else {
      btn.hidden = true;
    }
  });

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); 
  });

  btn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (selection.isCollapsed) return;
    
    const text = selection.toString().trim();
    if (!text) return;

    const nb = currentNotebook();
    const page = currentPage();
    
    const tones = ['yellow', 'blue', 'pink', 'white', 'outline'];
    const tone = tones[page.stickies.length % tones.length];

    const sticky = {
      id: `s_ext_${Date.now()}`,
      tone: tone,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 40,
      title: 'Extracted Note',
      text: text
    };
    
    page.stickies.push(sticky);
    saveState();
    
    if (state.view === 'notes') {
      renderPageContent();
      if (SoundFX.stickyDrop) SoundFX.stickyDrop();
    }
    
    selection.removeAllRanges();
    btn.hidden = true;
  });
}

function wireNewNotebook() {
  document.querySelector('#newNotebookBtn').addEventListener('click', () => {
    let selectedColor = NOTEBOOK_COLORS[Object.keys(notebooks).length % NOTEBOOK_COLORS.length].id;

    openModal(`
      <h3>New notebook</h3>
      <p>Give it a name and a color to spot it at a glance.</p>
      <input type="text" id="newNotebookName" placeholder="e.g. History">
      <div class="modal-color-grid">
        ${NOTEBOOK_COLORS.map((c) => `<button class="modal-color${c.id === selectedColor ? ' is-active' : ''}" data-color="${c.id}" style="--sw:${c.hex}" aria-label="${c.id}"></button>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="modal-btn cancel" data-modal-close>Cancel</button>
        <button class="modal-btn confirm" id="createNotebookBtn">Create</button>
      </div>
    `, {
      onOpen: (box) => {
        const nameInput = box.querySelector('#newNotebookName');
        nameInput.focus();

        box.querySelectorAll('.modal-color').forEach((btn) => {
          btn.addEventListener('click', () => {
            box.querySelectorAll('.modal-color').forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            selectedColor = btn.dataset.color;
          });
        });

        const create = () => {
          const name = nameInput.value.trim();
          if (!name) { nameInput.focus(); return; }
          const id = `nb${Date.now()}`;
          notebooks[id] = {
            label: name,
            color: selectedColor,
            pages: [{ id: 'first', tab: 'Page 1', title: name, date: 'Today', copy: 'Start writing…', blocks: [], stickies: [] }],
            flashcards: [],
            mindmap: { center: name, branches: [] }
          };
          renderNotebookList();
          switchNotebook(id);
          closeModal();
        };
        box.querySelector('#createNotebookBtn').addEventListener('click', create);
        nameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') create(); });
      }
    });
  });
}

function wireQuickFilters() {
  document.querySelectorAll('[data-quick]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('[data-quick]').forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');
      state.quickFilter = item.dataset.quick;
      renderNotebookList();
      closeSidebar();
    });
  });
}

function closeSidebar() {
  document.querySelector('#sidebar').classList.remove('is-open');
  document.querySelector('#sidebarBackdrop').classList.remove('is-open');
}

function wireSidebarCollapse() {
  document.querySelector('#sidebarCollapseBtn').addEventListener('click', () => {
    document.querySelector('#sidebar').classList.toggle('is-collapsed');
  });
}

/* ---------- Floating text-format toolbar (bold / italic / lists) ---------- */

function wireFormatBar() {
  const bar = document.querySelector('#formatBar');
  let activeTarget = null;

  document.addEventListener('focusin', (event) => {
    if (!event.target.matches || !event.target.matches('[contenteditable="true"]')) return;
    activeTarget = event.target;
    const rect = activeTarget.getBoundingClientRect();
    bar.style.left = `${Math.max(8, Math.min(window.innerWidth - 160, rect.left))}px`;
    bar.style.top = `${Math.max(8, rect.top - 42)}px`;
    bar.hidden = false;
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (document.activeElement !== activeTarget) bar.hidden = true;
    }, 150);
  });

  const LIST_CMDS = ['insertUnorderedList', 'insertOrderedList'];
  // Only these block-level editable regions get an auto title above a new
  // list — inline spans (list items, checklist text, mind-map labels) can't
  // hold a nested block element.
  const TITLEABLE_SELECTOR = '[data-page-copy], [data-sticky-text]';

  function refreshActiveStates() {
    bar.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.classList.toggle('is-active', document.queryCommandState(btn.dataset.cmd));
    });
    bar.querySelectorAll('[data-format]').forEach((btn) => {
      const value = document.queryCommandValue('formatBlock').toLowerCase();
      btn.classList.toggle('is-active', value === btn.dataset.format.toLowerCase());
    });
  }

  function insertListTitleIfMissing() {
    if (!activeTarget || !activeTarget.matches(TITLEABLE_SELECTOR)) return;
    const list = activeTarget.querySelector('ul, ol');
    if (!list) return;
    const prev = list.previousElementSibling;
    if (prev && prev.classList.contains('inline-list-title')) return;
    const title = document.createElement('div');
    title.className = 'inline-list-title';
    title.contentEditable = 'true';
    title.textContent = 'List title';
    list.parentNode.insertBefore(title, list);
  }

  bar.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('mousedown', (event) => event.preventDefault());
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      // Switching straight from one list type to the other would otherwise just
      // restyle the markers — turn the other list off first so the toggle always
      // lands back on a plain paragraph when the same button is clicked again.
      if (LIST_CMDS.includes(cmd)) {
        const otherCmd = LIST_CMDS.find((c) => c !== cmd);
        const turningOn = !document.queryCommandState(cmd);
        if (document.queryCommandState(otherCmd)) document.execCommand(otherCmd, false, null);
        document.execCommand(cmd, false, null);
        if (turningOn) insertListTitleIfMissing();
      } else {
        document.execCommand(cmd, false, null);
      }
      if (activeTarget) activeTarget.focus();
      refreshActiveStates();
    });
  });

  bar.querySelectorAll('[data-format]').forEach((btn) => {
    btn.addEventListener('mousedown', (event) => event.preventDefault());
    btn.addEventListener('click', () => {
      document.execCommand('formatBlock', false, btn.dataset.format);
      if (activeTarget) activeTarget.focus();
      refreshActiveStates();
    });
  });

  document.addEventListener('selectionchange', () => {
    if (!bar.hidden) refreshActiveStates();
  });
}

/* Rail popovers (brush color/thickness, page background) are positioned
   via fixed coordinates computed here rather than pure CSS — the rail
   itself scrolls internally on short screens, and a CSS-only popover
   would get silently clipped by that scroll container. */
function openRailPopover(button, menu) {
  menu.hidden = false;
  // Pin to a known width BEFORE measuring height so the vertical-centre
  // calculation uses the correct rendered height (not a narrow collapsed one).
  menu.style.position = 'fixed';
  menu.style.width = '220px';
  menu.style.left = 'auto';
  menu.style.right = `${window.innerWidth - button.getBoundingClientRect().left + 10}px`;
  menu.style.top = '-9999px'; // off-screen first so height measurement is accurate
  menu.style.bottom = 'auto';
  menu.style.zIndex = '40';

  // Now measure the correct rendered height
  const rect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let top = rect.top + rect.height / 2 - menuRect.height / 2;
  top = Math.max(8, Math.min(window.innerHeight - menuRect.height - 8, top));
  menu.style.top = `${top}px`;
}

/* Top-toolbar popovers (account, more-options) — same fixed-position trick
   as openRailPopover: .toolbar has overflow:hidden (to clip its scaled
   icons at narrow widths), which silently clips any CSS-positioned
   dropdown living inside it, so these open below the button via computed
   viewport coordinates instead. */
function openBelowPopover(button, menu) {
  menu.hidden = false;
  const rect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let left = rect.right - menuRect.width;
  left = Math.max(8, Math.min(window.innerWidth - menuRect.width - 8, left));
  let top = rect.bottom + 8;
  if (top + menuRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuRect.height - 8);
  }
  menu.style.position = 'fixed';
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.zIndex = '40';
}

function wireBrushOptions() {
  const btn = document.querySelector('#brushOptionsBtn');
  const menu = document.querySelector('#brushOptionsMenu');
  const widthInput = document.querySelector('#penWidthRange');
  const activeDot = document.querySelector('#brushActiveDot');
  const penActiveDot = document.querySelector('#penActiveDot');
  const previewDot = document.querySelector('#brushPreviewDot');
  const widthVal = document.querySelector('#brushWidthVal');

  // Move popover to body so fixed positioning is viewport-relative
  document.body.appendChild(menu);

  // Re-query presetBtns AFTER menu is on body
  const presetBtns = menu.querySelectorAll('.brush-preset-btn');

  function syncBrushUI() {
    // Update the color dots on both the palette button and pen tool button
    if (activeDot) activeDot.style.background = brushState.color;
    if (penActiveDot) penActiveDot.style.background = brushState.color;
    if (previewDot) {
      previewDot.style.background = brushState.color;
      const sizePx = Math.max(3, Math.min(22, brushState.width * 2.8));
      previewDot.style.width = `${sizePx}px`;
      previewDot.style.height = `${sizePx}px`;
    }
    if (widthVal) widthVal.textContent = `${brushState.width.toFixed(1)} px`;
    if (widthInput) widthInput.value = brushState.width;

    presetBtns.forEach((p) => {
      p.classList.toggle('is-active', Math.abs(parseFloat(p.dataset.preset) - brushState.width) < 0.2);
    });

    if (window.updateToolCursorAppearance) window.updateToolCursorAppearance();
  }

  syncBrushUI();

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    if (willOpen) openRailPopover(btn, menu);
    else menu.hidden = true;
  });

  // Stop all menu interactions from bubbling to the document close listener
  menu.addEventListener('click', (event) => event.stopPropagation());

  menu.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      menu.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
      swatch.classList.add('is-active');
      brushState.color = swatch.dataset.color;
      syncBrushUI();
    });
  });

  presetBtns.forEach((preset) => {
    preset.addEventListener('click', () => {
      brushState.width = parseFloat(preset.dataset.preset);
      syncBrushUI();
    });
  });

  widthInput.addEventListener('input', () => {
    brushState.width = Number(widthInput.value);
    syncBrushUI();
  });

  document.addEventListener('click', () => { menu.hidden = true; });
}

function wirePageBackground() {
  const btn = document.querySelector('#pageBgBtn');
  const menu = document.querySelector('#pageBgMenu');
  document.body.appendChild(menu);

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    if (willOpen) openRailPopover(btn, menu);
    else menu.hidden = true;
  });

  menu.querySelectorAll('[data-bg]').forEach((option) => {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      currentPage().background = option.dataset.bg;
      menu.querySelectorAll('[data-bg]').forEach((o) => o.classList.remove('is-active'));
      option.classList.add('is-active');
      const wrap = document.querySelector('#pageScaleLayer');
      wrap.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
      wrap.classList.add(`bg-${option.dataset.bg}`);
      const shell = document.querySelector('#notebookPage');
      shell.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
      shell.classList.add(`bg-${option.dataset.bg}`);
      menu.hidden = true;
    });
  });

  document.addEventListener('click', () => { menu.hidden = true; });
}

function wireSidebarToggle() {
  const sidebar = document.querySelector('#sidebar');
  const backdrop = document.querySelector('#sidebarBackdrop');

  document.querySelector('#sidebarToggle').addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
    backdrop.classList.toggle('is-open');
  });

  backdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSidebar();
      closeModal();
    }
  });
}

function wireTypingSound() {
  document.addEventListener('input', (event) => {
    if (event.target.closest && event.target.closest('[contenteditable="true"]')) SoundFX.writeScratch();
  });
}

/* All the per-field blur handlers (title, sticky text, mind map labels...)
   commit their edit straight into the data model — this one delegated
   listener (focusout bubbles, unlike blur) catches every one of them so
   nothing needs its own explicit save call. */
function wireEditableAutosave() {
  document.addEventListener('focusout', (event) => {
    if (event.target.closest && event.target.closest('[contenteditable="true"]')) scheduleSave();
  });
}

function wireSoundToggle() {
  const btn = document.querySelector('#soundToggleBtn');
  if (!btn) return;
  const onIcon = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const offIcon = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9z"/><line x1="16" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="16" y2="15"/></svg>';

  const syncUI = () => {
    btn.innerHTML = state.soundEnabled ? onIcon : offIcon;
    btn.classList.toggle('is-muted', !state.soundEnabled);
    btn.setAttribute('aria-pressed', String(!state.soundEnabled));
    btn.setAttribute('aria-label', state.soundEnabled ? 'Mute sounds' : 'Unmute sounds');
  };

  syncUI();

  btn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) {
      SoundFX.ensureCtx();
      SoundFX.penTap(); // Gentle feedback on enabling sound
    }
    syncUI();
    saveState();
  });
}

/* ---------- Local persistence ---------- */
/* Everything the user creates — notebooks, pages, stickies, flashcards,
   the mind map, review progress, and drawings — is saved to this browser's
   localStorage, so it's all still there next time they open the app. */
const STORAGE_KEY = 'drift-notes-v1';

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      notebooks,
      recents: state.recents,
      notebookId: state.notebookId,
      pageIndex: state.pageIndex,
      drawings: state.drawings,
      review: state.review,
      soundEnabled: state.soundEnabled
    }));
  } catch (err) {
    /* Storage full or unavailable (e.g. private browsing) — fail quietly,
       the app still works, it just won't persist this session. */
  }
  pushToServer();
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 500);
}

function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return;
  }
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return;
  }
  if (!data || typeof data !== 'object' || !data.notebooks) return;

  Object.keys(notebooks).forEach((key) => delete notebooks[key]);
  Object.assign(notebooks, data.notebooks);

  if (Array.isArray(data.recents)) state.recents = data.recents;
  if (data.notebookId && notebooks[data.notebookId]) state.notebookId = data.notebookId;
  else state.notebookId = Object.keys(notebooks)[0];
  if (typeof data.pageIndex === 'number') state.pageIndex = data.pageIndex;
  const pageCount = (notebooks[state.notebookId] && notebooks[state.notebookId].pages || []).length;
  if (state.pageIndex >= pageCount) state.pageIndex = Math.max(0, pageCount - 1);
  if (data.drawings && typeof data.drawings === 'object') state.drawings = data.drawings;
  if (data.review && typeof data.review === 'object') state.review = data.review;
  if (typeof data.soundEnabled === 'boolean') state.soundEnabled = data.soundEnabled;
}

function wireAutosave() {
  window.addEventListener('beforeunload', saveState);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState();
  });
  setInterval(saveState, 4000);
}

/* ---------- Account & cloud sync ---------- */
/* Notes sync directly with Cloud Firestore from the browser using the
   signed-in Firebase user's uid as the document id — no backend server
   involved. Firestore security rules (see firestore.rules) restrict each
   document to its own owner. If Firestore is unreachable, every call
   below just fails quietly and the app keeps working off localStorage. */
// AUTH_TOKEN_KEY, AUTH_USER_KEY are declared in auth.js (loaded first, shared global scope).

function getAuthToken() {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch (err) { return null; }
}

function setAuth(token, username) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, username);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (err) { /* private browsing — session-only, still fine */ }
}

function notesDocRef() {
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!user || !window.firestoreDb) return null;
  return window.firestoreDb.collection('drift_notes').doc(user.uid);
}

/* Fire-and-forget push to Firestore whenever we save locally — Firestore
   is the "account" copy, localStorage is the always-on fallback. */
function pushToServer() {
  const docRef = notesDocRef();
  if (!docRef) return;
  docRef.set({
    notebooks,
    recents: state.recents,
    notebookId: state.notebookId,
    pageIndex: state.pageIndex,
    drawings: state.drawings,
    review: state.review,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(() => { /* offline right now — will retry on next save */ });
}

async function pullFromServer() {
  const docRef = notesDocRef();
  if (!docRef) return false;
  const snapshot = await docRef.get();
  const data = snapshot.exists ? snapshot.data() : null;
  if (!data || !data.notebooks || !Object.keys(data.notebooks).length) return false;

  Object.keys(notebooks).forEach((key) => delete notebooks[key]);
  Object.assign(notebooks, data.notebooks);
  if (Array.isArray(data.recents)) state.recents = data.recents;
  state.notebookId = (data.notebookId && notebooks[data.notebookId]) ? data.notebookId : Object.keys(notebooks)[0];
  state.pageIndex = typeof data.pageIndex === 'number' ? data.pageIndex : 0;
  const pageCount = (notebooks[state.notebookId] && notebooks[state.notebookId].pages || []).length;
  if (state.pageIndex >= pageCount) state.pageIndex = Math.max(0, pageCount - 1);
  if (data.drawings && typeof data.drawings === 'object') state.drawings = data.drawings;
  if (data.review && typeof data.review === 'object') state.review = data.review;
  return true;
}

function refreshAccountUI() {
  const username = (() => { try { return localStorage.getItem(AUTH_USER_KEY); } catch (err) { return null; } })();
  const dot = document.querySelector('#accountDot');
  const profileOut = document.querySelector('#accountProfileOut');
  const profileIn = document.querySelector('#accountProfileIn');
  const avatar = document.querySelector('#accountAvatar');
  const usernameLabel = document.querySelector('#accountUsernameLabel');
  const signInBtn = document.querySelector('#accountSignInBtn');
  const syncBtn = document.querySelector('#accountSyncNowBtn');
  const signOutBtn = document.querySelector('#accountSignOutBtn');
  const signedIn = Boolean(getAuthToken() && username && username.trim());

  if (dot) dot.hidden = !signedIn;
  if (profileOut) profileOut.hidden = signedIn;
  if (profileIn) profileIn.hidden = !signedIn;
  if (signedIn) {
    if (avatar) avatar.textContent = username.trim().charAt(0).toUpperCase() || '?';
    if (usernameLabel) usernameLabel.textContent = username;
  }
  if (signInBtn) signInBtn.textContent = signedIn ? 'Switch account' : 'Sign in / Create account';
  if (syncBtn) syncBtn.hidden = !signedIn;
  if (signOutBtn) signOutBtn.hidden = !signedIn;
}

function reRenderEverything() {
  const nb = notebooks[state.notebookId];
  if (!nb) return;
  document.querySelector('#dropdownDot').className = `dot dot-${nb.color}`;
  document.querySelector('#dropdownLabel').textContent = `${nb.label} Notes`;
  renderNotebookList();
  renderPageTabs();
  renderPage();
  renderFlashcard();
  renderMindmap();
  renderReview();
}

function openAccountAuthModal() {
  openModal(`
    <h3>Switch account</h3>
    <p>This app now uses Firebase Authentication. Sign out, then continue in the login gate to switch Google/Firebase accounts.</p>
    <div class="modal-actions">
      <button class="modal-btn cancel" data-modal-close>Cancel</button>
      <button class="modal-btn confirm" id="accountSubmitBtn">Sign out now</button>
    </div>
  `, {
    onOpen: (box) => {
      const submitBtn = box.querySelector('#accountSubmitBtn');
      submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        try {
          if (window.firebaseAuth) {
            await window.firebaseAuth.signOut();
          }
          setAuth(null, null);
          refreshAccountUI();
          closeModal();
          showAuthGate();
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  });
}

function wireAccountMenu() {
  const btn = document.querySelector('#accountBtn');
  const menu = document.querySelector('#accountMenu');
  if (!btn || !menu) return;
  document.body.appendChild(menu);

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    if (willOpen) openBelowPopover(btn, menu);
    else menu.hidden = true;
  });

  document.querySelector('#accountSignInBtn').addEventListener('click', () => {
    menu.hidden = true;
    if (getAuthToken()) {
      openAccountAuthModal();
    } else {
      showAuthGate();
    }
  });

  document.querySelector('#accountSyncNowBtn').addEventListener('click', async () => {
    menu.hidden = true;
    try {
      await pullFromServer();
      reRenderEverything();
      saveState();
    } catch (err) {
      openModal(`
        <h3>Couldn't reach Firestore</h3>
        <p>Check your connection and Firebase project setup, then try again.</p>
        <div class="modal-actions"><button class="modal-btn confirm" data-modal-close>OK</button></div>
      `);
    }
  });

  document.querySelector('#accountSignOutBtn').addEventListener('click', () => {
    menu.hidden = true;
    if (window.firebaseAuth) {
      window.firebaseAuth.signOut().catch(() => { /* no-op */ });
    }
    setAuth(null, null);
    refreshAccountUI();
    showAuthGate();
  });

  document.addEventListener('click', () => { menu.hidden = true; });

  refreshAccountUI();
}

loadState();

if (getAuthToken()) {
  pullFromServer().then((pulled) => { if (pulled) reRenderEverything(); }).catch(() => { /* offline — local copy is already loaded */ });
}

window.addEventListener('drift-auth-changed', async (event) => {
  refreshAccountUI();
  if (!event.detail || !event.detail.signedIn) return;
  try {
    const pulled = await pullFromServer();
    if (!pulled) pushToServer();
    reRenderEverything();
    saveState();
  } catch (err) { /* offline — local data remains usable */ }
});

const initialNotebook = notebooks[state.notebookId];
if (initialNotebook) {
  document.querySelector('#dropdownDot').className = `dot dot-${initialNotebook.color}`;
  document.querySelector('#dropdownLabel').textContent = `${initialNotebook.label} Notes`;
}

renderNotebookList();
renderPageTabs();
renderPage();
renderFlashcard();
renderMindmap();
renderReview();
function wirePageTabReveal() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('.page-tabs-row')) return;
    document.querySelectorAll('.page-tab-wrap.is-revealed').forEach((w) => w.classList.remove('is-revealed'));
  });
}

wirePageNav();
wirePageScaling();
wirePageTabReveal();
wireToolbarScaling();
wireSwipe();
wireAddPage();
wirePagesListModal();
wireAddMenu();
wireDrawingTools();
wireToolCursorPreview();
wireUndoRedo();
wireBrushOptions();
wirePageBackground();
wirePinchResize();
wireConvertPenToText();
wireViewTabs();
wireFlashcards();
wireFlashcardToolbar();
wireMindmapAdd();
wireReviewToolbar();
wireReviewFilters();
wireSearch();
wireMenus();
wireFileToNotesImport();
wireDragAndDropImport();
wireReadingPaneExtraction();
wireNewNotebook();
wireQuickFilters();
wireSidebarToggle();
wireSidebarCollapse();
wireFormatBar();
wireTypingSound();
wireEditableAutosave();
wireSoundToggle();
wireAutosave();
wireAccountMenu();
wireNotebookDropdown();
