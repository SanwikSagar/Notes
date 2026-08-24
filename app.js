/*
  Drift — behavior layer.
  Multi-page notebooks with a real page-turn animation, draggable sticky
  notes, an actual drawing canvas, flashcards, a mind map, spaced review,
  and full notebook management — tuned for touch on mobile/tablet.
*/

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
  recents: ['biology']
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
    tab.addEventListener('click', () => goToPage(Number(tab.dataset.index)));
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
  dots.innerHTML = nb.pages.map((_, index) => `<span class="page-dot${index === state.pageIndex ? ' is-active' : ''}"></span>`).join('');
}

function stickyHTML(sticky) {
  const delBtn = `<button class="sticky-delete" data-id="${sticky.id}" aria-label="Delete note">×</button>`;
  const resizeHandle = `<span class="resize-handle" data-resize="${sticky.id}"></span>`;
  const widthStyle = sticky.width ? `--w:${sticky.width}px; ` : '';

  if (sticky.image) {
    return `
      <article class="sticky sticky-image sticky-loose" data-id="${sticky.id}" style="${widthStyle}--x:${sticky.x}%; --y:${sticky.y}%">
        ${delBtn}
        <img src="${sticky.image}" alt="${sticky.title || 'Image note'}" draggable="false">
        ${resizeHandle}
      </article>
    `;
  }

  if (sticky.checklist) {
    return `
      <article class="sticky sticky-${sticky.tone} sticky-loose" data-id="${sticky.id}" style="${widthStyle}--x:${sticky.x}%; --y:${sticky.y}%">
        ${delBtn}
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
  return `
    <article class="sticky sticky-${sticky.tone} sticky-loose" data-id="${sticky.id}" style="${widthStyle}--x:${sticky.x}%; --y:${sticky.y}%">
      ${delBtn}
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
  const wrap = document.querySelector('#notebookPage');
  wrap.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
  wrap.classList.add(`bg-${page.background || 'ruled'}`);
  document.querySelectorAll('#pageBgMenu [data-bg]').forEach((option) => {
    option.classList.toggle('is-active', option.dataset.bg === (page.background || 'ruled'));
  });
  wrap.innerHTML = `
    <div class="spiral" aria-hidden="true"></div>
    <canvas class="draw-canvas" id="drawCanvas"></canvas>
    <div class="page-content">
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
    ${(page.stickies || []).map(stickyHTML).join('')}
  `;

  wirePageMeta();
  wireBlocks();
  wireChecklist();
  wireStickyInteractions();
  wireStickyEditing();
  setupCanvas();
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

  stage.addEventListener('touchstart', (event) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', (event) => {
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

/* ---------- Sticky notes ---------- */

function wireStickyInteractions() {
  const page = document.querySelector('#notebookPage');

  page.querySelectorAll('.sticky-delete').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = btn.dataset.id;
      currentPage().stickies = (currentPage().stickies || []).filter((s) => s.id !== id);
      renderPageContent();
    });
  });

  page.querySelectorAll('.sticky-loose').forEach((sticky) => {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    sticky.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[contenteditable]') || event.target.closest('input') || event.target.closest('.resize-handle')) return;
      dragging = true;
      sticky.setPointerCapture(event.pointerId);
      const rect = page.getBoundingClientRect();
      offsetX = event.clientX - rect.left - (parseFloat(sticky.style.getPropertyValue('--x')) / 100) * rect.width;
      offsetY = event.clientY - rect.top - (parseFloat(sticky.style.getPropertyValue('--y')) / 100) * rect.height;
      sticky.classList.add('is-dragging');
    });

    sticky.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = page.getBoundingClientRect();
      // Allow a small overhang so notes can sit flush against — or slightly past — the page edge.
      let xPct = ((event.clientX - rect.left - offsetX) / rect.width) * 100;
      let yPct = ((event.clientY - rect.top - offsetY) / rect.height) * 100;
      xPct = Math.max(-8, Math.min(96, xPct));
      yPct = Math.max(-8, Math.min(96, yPct));
      sticky.style.setProperty('--x', `${xPct}%`);
      sticky.style.setProperty('--y', `${yPct}%`);
    });

    sticky.addEventListener('pointerup', () => {
      dragging = false;
      sticky.classList.remove('is-dragging');
      const id = sticky.dataset.id;
      const data = (currentPage().stickies || []).find((s) => s.id === id);
      if (data) {
        data.x = parseFloat(sticky.style.getPropertyValue('--x'));
        data.y = parseFloat(sticky.style.getPropertyValue('--y'));
      }
    });
  });

  wireStickyResize();
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
      const width = Math.max(120, Math.min(420, startWidth + (event.clientX - startX)));
      sticky.style.setProperty('--w', `${width}px`);
    });

    handle.addEventListener('pointerup', () => {
      if (!resizing) return;
      resizing = false;
      const data = (currentPage().stickies || []).find((s) => s.id === handle.dataset.resize);
      if (data) data.width = parseFloat(sticky.style.getPropertyValue('--w'));
    });
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

const POPOVER_SELECTORS = ['#addMenu', '#moreMenu', '#brushOptionsMenu', '#pageBgMenu'];

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
  } else if (type === 'text') {
    stickies.push({ id, tone: 'white', x, y, title: 'Note', text: 'Type here…' });
  } else if (type === 'image') {
    stickies.push({ id, x, y, width: 200, image: extra.dataUrl, title: 'Image note' });
  } else {
    stickies.push({ id, tone: 'yellow', x, y, title: 'Sticky note', text: 'Type here…' });
  }
  renderPageContent();
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
    const saved = canvas.toDataURL ? canvas.toDataURL() : null;
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

  let drawing = false;
  let last = null;

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const point = pointerToCanvas(event);
    const style = strokeStyleFor(state.tool);
    ctx.globalCompositeOperation = style.comp;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    last = point;
  });

  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
    canvas.addEventListener(evt, () => {
      if (drawing) {
        drawing = false;
        pushUndoSnapshot(pageKey, canvas.toDataURL());
      }
    });
  });

  window.addEventListener('resize', resize, { once: true });
  updateCanvasPointerEvents();
}

function updateCanvasPointerEvents() {
  const canvas = document.querySelector('#drawCanvas');
  if (!canvas) return;
  const drawTools = ['pen', 'highlighter', 'eraser'];
  canvas.style.pointerEvents = drawTools.includes(state.tool) ? 'auto' : 'none';
}

function pushUndoSnapshot(pageKey, dataUrl) {
  if (!state.undoStacks[pageKey]) state.undoStacks[pageKey] = [];
  state.undoStacks[pageKey].push(dataUrl);
  state.redoStacks[pageKey] = [];
  state.drawings[pageKey] = dataUrl;
}

function saveCanvasSnapshot() {
  const canvas = document.querySelector('#drawCanvas');
  if (!canvas) return;
  const pageKey = canvas.dataset.key;
  if (pageKey) state.drawings[pageKey] = canvas.toDataURL();
}

function wireDrawingTools() {
  const tools = document.querySelectorAll('.tool-btn');
  tools.forEach((tool) => {
    tool.addEventListener('click', () => {
      tools.forEach((item) => item.classList.remove('is-active'));
      tool.classList.add('is-active');
      state.tool = tool.dataset.tool;
      updateCanvasPointerEvents();

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
          page.removeEventListener('click', handler);
        };
        page.addEventListener('click', handler, { once: true });
      }
    });
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

/* ---------- View tabs (Notes / Flashcards / Mind Map / Review) ---------- */

function setView(view) {
  state.view = view;
  document.querySelectorAll('.view-tabs button').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === view));
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.view === view));
  if (view === 'mindmap') renderMindmap();
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

function renderMindmap() {
  const nb = currentNotebook();
  const canvas = document.querySelector('#mindmapCanvas');
  const branches = nb.mindmap.branches;

  const nodesHTML = `
    <div class="mindmap-node mindmap-center" contenteditable="true" data-mind-center>${nb.mindmap.center}</div>
    ${branches.map((b, i) => `
      <div class="mindmap-node mindmap-branch tone-${i % 5}" data-index="${i}" style="--x:${b.x}%; --y:${b.y}%">
        <span contenteditable="true" data-mind-label="${i}">${b.label}</span>
        <button class="mindmap-node-delete" data-mind-del="${i}" aria-label="Remove idea">×</button>
      </div>
    `).join('')}
    ${branches.length === 0 ? '<p class="mindmap-empty">Double-click anywhere, or tap +, to add your first idea.</p>' : ''}
  `;
  canvas.innerHTML = `<svg class="mindmap-lines" id="mindmapLines" viewBox="0 0 100 100" preserveAspectRatio="none">
    ${branches.map((b, i) => `<line x1="50" y1="50" x2="${b.x}" y2="${b.y}" stroke="${MINDMAP_TONES[i % 5]}" />`).join('')}
  </svg>${nodesHTML}`;

  wireMindmapInteractions();
}

function updateMindmapLines() {
  const nb = currentNotebook();
  const lines = document.querySelector('#mindmapLines');
  if (!lines) return;
  lines.innerHTML = nb.mindmap.branches.map((b, i) => `<line x1="50" y1="50" x2="${b.x}" y2="${b.y}" stroke="${MINDMAP_TONES[i % 5]}" />`).join('');
}

function addMindmapNode(x, y) {
  currentNotebook().mindmap.branches.push({ label: 'New idea', x, y });
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
      const idx = Number(el.dataset.mindLabel);
      if (nb.mindmap.branches[idx]) nb.mindmap.branches[idx].label = el.textContent.trim() || nb.mindmap.branches[idx].label;
    });
  });

  canvas.querySelectorAll('[data-mind-del]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      nb.mindmap.branches.splice(Number(btn.dataset.mindDel), 1);
      renderMindmap();
    });
  });

  canvas.querySelectorAll('.mindmap-branch').forEach((node) => {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    node.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[contenteditable]') || event.target.closest('button')) return;
      dragging = true;
      node.classList.add('is-dragging');
      node.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      const branch = nb.mindmap.branches[Number(node.dataset.index)];
      offsetX = event.clientX - rect.left - (branch.x / 100) * rect.width;
      offsetY = event.clientY - rect.top - (branch.y / 100) * rect.height;
    });

    node.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const xPct = Math.max(4, Math.min(96, ((event.clientX - rect.left - offsetX) / rect.width) * 100));
      const yPct = Math.max(4, Math.min(96, ((event.clientY - rect.top - offsetY) / rect.height) * 100));
      node.style.setProperty('--x', `${xPct}%`);
      node.style.setProperty('--y', `${yPct}%`);
      const branch = nb.mindmap.branches[Number(node.dataset.index)];
      branch.x = xPct;
      branch.y = yPct;
      updateMindmapLines();
    });

    node.addEventListener('pointerup', () => {
      dragging = false;
      node.classList.remove('is-dragging');
    });
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
      branch.x = 50 + 38 * Math.cos(angle);
      branch.y = 50 + 38 * Math.sin(angle);
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

  if (!items.length) {
    list.innerHTML = '<p class="empty-review">No review items yet — add flashcards to this notebook first.</p>';
  } else {
    const due = items.filter((item) => !item.mastered);
    const mastered = items.filter((item) => item.mastered);
    const ordered = [...due, ...mastered];
    const celebrate = due.length === 0
      ? '<p class="review-celebrate">🎉 All caught up — everything in this notebook is mastered!</p>'
      : '';

    list.innerHTML = celebrate + ordered.map((item) => `
      <article class="review-card${item.mastered ? ' is-mastered' : ''}" data-key="${item.key}">
        <p class="review-q">${item.q}</p>
        <p class="review-a">${item.a}</p>
        <div class="review-actions">
          <button class="review-btn review-again" data-key="${item.key}">Review again</button>
          <button class="review-btn review-got-it" data-key="${item.key}">Got it ✓</button>
        </div>
      </article>
    `).join('');
  }

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
  renderReview();
}

function wireReviewToolbar() {
  document.querySelector('#shuffleReviewBtn').addEventListener('click', shuffleReview);
  document.querySelector('#resetReviewBtn').addEventListener('click', resetReviewProgress);
}

function updateReviewProgress() {
  const items = reviewItemsFor(state.notebookId);
  const mastered = items.filter((i) => i.mastered).length;
  document.querySelector('#reviewMastered').textContent = mastered;
  document.querySelector('#reviewDue').textContent = items.length - mastered;
  document.querySelector('#reviewFill').style.width = items.length ? `${(mastered / items.length) * 100}%` : '0%';
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
  }

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', () => { if (input.value.trim()) renderResults(); });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) results.hidden = true;
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
  moreBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = moreMenu.hidden;
    closeAllPopovers();
    moreMenu.hidden = !willOpen;
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

  bar.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('mousedown', (event) => event.preventDefault());
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.cmd, false, null);
      if (activeTarget) activeTarget.focus();
    });
  });
}

function wireBrushOptions() {
  const btn = document.querySelector('#brushOptionsBtn');
  const menu = document.querySelector('#brushOptionsMenu');
  const widthInput = document.querySelector('#penWidthRange');

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    menu.hidden = !willOpen;
  });

  menu.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-active'));
      swatch.classList.add('is-active');
      brushState.color = swatch.dataset.color;
    });
  });

  widthInput.addEventListener('click', (event) => event.stopPropagation());
  widthInput.addEventListener('input', () => { brushState.width = Number(widthInput.value); });

  document.addEventListener('click', () => { menu.hidden = true; });
}

function wirePageBackground() {
  const btn = document.querySelector('#pageBgBtn');
  const menu = document.querySelector('#pageBgMenu');

  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = menu.hidden;
    closeAllPopovers();
    menu.hidden = !willOpen;
  });

  menu.querySelectorAll('[data-bg]').forEach((option) => {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      currentPage().background = option.dataset.bg;
      menu.querySelectorAll('[data-bg]').forEach((o) => o.classList.remove('is-active'));
      option.classList.add('is-active');
      const wrap = document.querySelector('#notebookPage');
      wrap.classList.remove('bg-ruled', 'bg-grid', 'bg-blank');
      wrap.classList.add(`bg-${option.dataset.bg}`);
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

renderNotebookList();
renderPageTabs();
renderPage();
renderFlashcard();
renderMindmap();
renderReview();
wirePageNav();
wireSwipe();
wireAddPage();
wireAddMenu();
wireDrawingTools();
wireUndoRedo();
wireBrushOptions();
wirePageBackground();
wireViewTabs();
wireFlashcards();
wireFlashcardToolbar();
wireMindmapAdd();
wireReviewToolbar();
wireSearch();
wireMenus();
wireNewNotebook();
wireQuickFilters();
wireSidebarToggle();
wireSidebarCollapse();
wireFormatBar();

