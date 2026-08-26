/*
  Smoke test for the Drift Firebase sync server.
  - Always checks static serving and auth guards.
  - Optionally checks full notes read/write when FIREBASE_TEST_ID_TOKEN is set.
*/
const BASE = 'http://localhost:8787';
const TEST_TOKEN = process.env.FIREBASE_TEST_ID_TOKEN || '';
let failures = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label}`);
    failures += 1;
  }
}

async function main() {
  console.log('-- static app serving --');
  const home = await fetch(`${BASE}/`);
  const homeText = await home.text();
  check('GET / returns 200', home.status === 200);
  check('GET / serves index.html content', homeText.includes('<title>') || homeText.includes('Creative Notes') || homeText.includes('drift'));
  const appJs = await fetch(`${BASE}/app.js`);
  check('GET /app.js returns 200', appJs.status === 200);
  const blocked = await fetch(`${BASE}/server/server.js`);
  check('GET /server/server.js is blocked (404)', blocked.status === 404);

  console.log('-- auth endpoints now frontend-only --');
  const signup = await fetch(`${BASE}/api/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', password: '123456' })
  });
  check('/api/signup returns 410', signup.status === 410);
  const login = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.com', password: '123456' })
  });
  check('/api/login returns 410', login.status === 410);

  console.log('-- notes: auth guard --');
  const noAuth = await fetch(`${BASE}/api/notes`);
  check('GET /api/notes with no token is rejected (401)', noAuth.status === 401);
  const badToken = await fetch(`${BASE}/api/notes`, { headers: { Authorization: 'Bearer nonsense' } });
  check('GET /api/notes with bad token is rejected (401)', badToken.status === 401);

  if (!TEST_TOKEN) {
    console.log('-- tokened notes flow skipped --');
    console.log('Set FIREBASE_TEST_ID_TOKEN to run Firestore read/write checks.');
  } else {
    console.log('-- notes: read/write round-trip --');
    const empty = await fetch(`${BASE}/api/notes`, { headers: { Authorization: `Bearer ${TEST_TOKEN}` } });
    check('GET /api/notes with Firebase token succeeds (200)', empty.status === 200);

    const payload = {
      notebooks: { bio: { label: 'Bio', color: 'biology', pages: [{ id: 'p1', tab: 'Page 1', title: 'Hello', date: 'Today', copy: 'Test note', blocks: [], stickies: [] }], flashcards: [], mindmap: { center: 'Bio', branches: [] } } },
      recents: ['bio'], notebookId: 'bio', pageIndex: 0, drawings: {}, review: {}
    };
    const put = await fetch(`${BASE}/api/notes`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TEST_TOKEN}` }, body: JSON.stringify(payload)
    });
    check('PUT /api/notes succeeds (200)', put.status === 200);

    const reread = await fetch(`${BASE}/api/notes`, { headers: { Authorization: `Bearer ${TEST_TOKEN}` } });
    const rereadBody = await reread.json();
    check('saved notebook round-trips correctly', rereadBody.notebooks && rereadBody.notebooks.bio && rereadBody.notebooks.bio.pages[0].title === 'Hello');

    const logout = await fetch(`${BASE}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${TEST_TOKEN}` } });
    check('logout endpoint responds (200)', logout.status === 200);
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
