const app = document.getElementById("app");
const LETTERS = "ABCD";
const HAS_FC = typeof FC !== "undefined";
let state = null;
let mode = "test"; // "test" | "cards"

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function home() {
  state = null;
  const cards = mode === "cards";
  const src = cards ? FC : Q;
  const subjects = [...new Set(src.map(x => x.s))];
  app.innerHTML = `
    <h1>CompTIA A+ Core 1 (220-1201) Practice</h1>
    ${HAS_FC ? `<div class="tabs">
      <button class="${cards ? "ghost" : ""}" data-mode="test">Practice test</button>
      <button class="${cards ? "" : "ghost"}" data-mode="cards">Flashcards</button>
    </div>` : ""}
    <div class="muted">${cards
      ? `${FC.length} flashcards. The deck is shuffled every run.`
      : `${Q.length} questions. Order and answer choices are shuffled every run.`}</div>
    <div class="card">
      <strong>${cards ? "Decks" : "Subjects"}</strong>
      ${subjects.map(s => `<label class="sub"><span><input type="checkbox" value="${esc(s)}" checked>${esc(s)}</span><span class="muted">${src.filter(x => x.s === s).length}</span></label>`).join("")}
      <div class="row">
        <button class="ghost" id="all">All</button><button class="ghost" id="none">None</button>
      </div>
      <div class="row">
        ${cards
          ? `<label><input type="checkbox" id="reverse"> Show answer side first</label>`
          : `<label>Questions: <select id="count">
              <option value="10">10</option><option value="25">25</option><option value="50" selected>50</option>
              <option value="90">90 (exam length)</option><option value="0">All selected</option>
            </select></label>
            <label><input type="checkbox" id="instant" checked> Show answer immediately</label>`}
      </div>
      <div class="row"><button id="start">${cards ? "Start flashcards" : "Start test"}</button></div>
    </div>`;
  app.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { mode = b.dataset.mode; home(); });
  const boxes = [...app.querySelectorAll(".sub input")];
  app.querySelector("#all").onclick = () => boxes.forEach(b => b.checked = true);
  app.querySelector("#none").onclick = () => boxes.forEach(b => b.checked = false);
  app.querySelector("#start").onclick = () => {
    const picked = boxes.filter(b => b.checked).map(b => b.value);
    if (!picked.length) return alert("Pick at least one subject.");
    let pool = shuffle(src.filter(x => picked.includes(x.s)));
    if (cards) return startCards(pool, app.querySelector("#reverse").checked);
    const n = +app.querySelector("#count").value;
    if (n) pool = pool.slice(0, n);
    start(pool, app.querySelector("#instant").checked);
  };
}

/* ---------- Flashcards ---------- */
function startCards(deck, reverse) {
  state = { kind: "cards", reverse, i: 0, flipped: false, deck, known: [], again: [] };
  renderCard();
}

function renderCard() {
  const { deck, i, flipped, reverse, known, again } = state;
  const c = deck[i];
  const front = reverse ? c.b : c.f, back = reverse ? c.f : c.b;
  app.innerHTML = `
    <div class="row" style="justify-content:space-between;margin:0">
      <span class="muted">Card ${i + 1} of ${deck.length} · <span style="color:var(--ok)">${known.length} got it</span> · <span style="color:var(--bad)">${again.length} still learning</span></span>
      <button class="ghost" id="quit">End</button>
    </div>
    <div class="bar"><div style="width:${(i / deck.length) * 100}%"></div></div>
    <div class="flash ${flipped ? "flipped" : ""}" id="flash" role="button" tabindex="0">
      <div class="tag">${esc(c.s)} · ${flipped ? "Answer" : "Prompt"}</div>
      <div class="face">${esc(flipped ? back : front)}</div>
      ${flipped ? `<div class="muted small">${esc(front)}</div>` : `<div class="muted small">Click or press Space to flip</div>`}
    </div>
    <div class="row">
      <button class="ghost" id="prev" ${i === 0 ? "disabled" : ""}>Back</button>
      ${flipped
        ? `<button class="bad" id="again">Still learning</button><button class="ok" id="got">Got it</button>`
        : `<button id="flip">Flip</button>`}
    </div>
    <div class="muted" style="font-size:.85rem;margin-top:10px">Keys: <kbd>Space</kbd> flip, <kbd>1</kbd>/<kbd>←</kbd> still learning, <kbd>2</kbd>/<kbd>→</kbd> got it, <kbd>Backspace</kbd> back</div>`;
  app.querySelector("#flash").onclick = flip;
  app.querySelector("#quit").onclick = cardResults;
  app.querySelector("#prev").onclick = prevCard;
  if (flipped) {
    app.querySelector("#again").onclick = () => mark(false);
    app.querySelector("#got").onclick = () => mark(true);
  } else app.querySelector("#flip").onclick = flip;
}

function flip() { state.flipped = !state.flipped; renderCard(); }

function mark(ok) {
  const c = state.deck[state.i];
  state.known = state.known.filter(x => x !== c);
  state.again = state.again.filter(x => x !== c);
  (ok ? state.known : state.again).push(c);
  state.flipped = false;
  if (state.i < state.deck.length - 1) { state.i++; renderCard(); } else cardResults();
}

function prevCard() {
  if (state.i === 0) return;
  state.i--; state.flipped = false; renderCard();
}

function cardResults() {
  const { known, again, deck, reverse } = state;
  state.done = true;
  app.innerHTML = `
    <h1>Flashcards done</h1>
    <div class="card">
      <div class="big" style="color:var(--ok)">${known.length} / ${known.length + again.length}</div>
      <div class="muted">marked "Got it" (${deck.length} cards in this deck)</div>
      <div class="row">
        ${again.length ? `<button id="review">Review still learning (${again.length})</button>` : ""}
        <button class="ghost" id="restart">Restart deck</button>
        <button class="ghost" id="home">Home</button>
      </div>
    </div>
    ${again.length ? `<div class="card"><strong>Still learning</strong>${again.map(c => `
      <div class="miss"><div class="tag">${esc(c.s)}</div><div><strong>${esc(c.f)}</strong></div><div class="muted">${esc(c.b)}</div></div>`).join("")}</div>` : ""}`;
  if (again.length) app.querySelector("#review").onclick = () => startCards(shuffle(again), reverse);
  app.querySelector("#restart").onclick = () => startCards(shuffle(deck), reverse);
  app.querySelector("#home").onclick = home;
}

function start(pool, instant) {
  state = {
    instant, i: 0,
    items: pool.map(q => ({ q, choices: shuffle([q.a, ...q.w]), pick: null })),
  };
  render();
}

function render() {
  const { items, i, instant } = state;
  const it = items[i];
  const answered = it.pick !== null;
  const reveal = answered && instant;
  app.innerHTML = `
    <div class="row" style="justify-content:space-between;margin:0">
      <span class="muted">Question ${i + 1} of ${items.length}</span>
      <button class="ghost" id="quit">End test</button>
    </div>
    <div class="bar"><div style="width:${(i / items.length) * 100}%"></div></div>
    <div class="card">
      <div class="tag">${esc(it.q.s)}</div>
      <p style="font-size:1.1rem;margin:6px 0 10px">${esc(it.q.q)}</p>
      ${it.choices.map((c, k) => {
        let cls = "choice";
        if (reveal && c === it.q.a) cls += " correct";
        else if (reveal && c === it.pick) cls += " wrong";
        else if (answered && !instant && c === it.pick) cls += " correct";
        return `<button class="${cls}" data-c="${k}" ${reveal ? "disabled" : ""}><strong>${LETTERS[k]}.</strong> ${esc(c)}</button>`;
      }).join("")}
      ${reveal ? `<div class="explain"><strong>${it.pick === it.q.a ? "Correct." : "Incorrect."}</strong> ${esc(it.q.e)}</div>` : ""}
      <div class="row">
        <button class="ghost" id="prev" ${i === 0 ? "disabled" : ""}>Back</button>
        <button id="next" ${answered ? "" : "disabled"}>${i === items.length - 1 ? "Finish" : "Next"}</button>
        <span class="muted" style="font-size:.85rem">Keys: <kbd>1-4</kbd>/<kbd>A-D</kbd> answer, <kbd>Enter</kbd> next</span>
      </div>
    </div>`;
  app.querySelectorAll(".choice").forEach(b => b.onclick = () => choose(+b.dataset.c));
  app.querySelector("#prev").onclick = () => { state.i--; render(); };
  app.querySelector("#next").onclick = next;
  app.querySelector("#quit").onclick = () => confirm("End test now and see results?") && results();
}

function choose(k) {
  const it = state.items[state.i];
  if (state.instant && it.pick !== null) return;
  it.pick = it.choices[k];
  render();
}

function next() {
  if (state.items[state.i].pick === null) return;
  if (state.i < state.items.length - 1) { state.i++; render(); } else results();
}

function results() {
  const done = state.items.filter(x => x.pick !== null);
  const right = done.filter(x => x.pick === x.q.a);
  const missed = state.items.filter(x => x.pick !== null && x.pick !== x.q.a);
  const pct = done.length ? Math.round((right.length / done.length) * 100) : 0;
  const bySub = {};
  done.forEach(x => { const b = bySub[x.q.s] ||= [0, 0]; b[1]++; if (x.pick === x.q.a) b[0]++; });
  state.done = true;
  app.innerHTML = `
    <h1>Results</h1>
    <div class="card">
      <div class="big" style="color:${pct >= 75 ? "var(--ok)" : "var(--bad)"}">${pct}%</div>
      <div class="muted">${right.length} of ${done.length} answered correctly · ~75% is a rough passing target (675/900)</div>
      ${Object.entries(bySub).map(([s, [r, t]]) => `<div class="row" style="justify-content:space-between;margin-top:8px"><span>${esc(s)}</span><span>${r}/${t} (${Math.round(r / t * 100)}%)</span></div>`).join("")}
      <div class="row">
        ${missed.length ? `<button id="retry">Retest missed (${missed.length})</button>` : ""}
        <button class="ghost" id="again">Same set, reshuffled</button>
        <button class="ghost" id="home">New test</button>
      </div>
    </div>
    ${missed.length ? `<div class="card"><strong>Missed questions</strong>${missed.map(x => `
      <div class="miss"><div class="tag">${esc(x.q.s)}</div><div>${esc(x.q.q)}</div>
      <div style="color:var(--bad)">Your answer: ${esc(x.pick)}</div>
      <div style="color:var(--ok)">Correct: ${esc(x.q.a)}</div>
      <div class="muted">${esc(x.q.e)}</div></div>`).join("")}</div>` : ""}`;
  if (missed.length) app.querySelector("#retry").onclick = () => start(shuffle(missed.map(x => x.q)), state.instant);
  app.querySelector("#again").onclick = () => start(shuffle(state.items.map(x => x.q)), state.instant);
  app.querySelector("#home").onclick = home;
}

document.addEventListener("keydown", e => {
  if (!state || state.done || e.target.tagName === "SELECT") return;
  if (state.kind === "cards") {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
    else if (e.key === "Backspace") { e.preventDefault(); prevCard(); }
    else if (state.flipped && (e.key === "1" || e.key === "ArrowLeft")) mark(false);
    else if (state.flipped && (e.key === "2" || e.key === "ArrowRight")) mark(true);
    return;
  }
  const k = e.key.toLowerCase();
  const idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
  if (idx >= 0 && idx < state.items[state.i].choices.length) choose(idx);
  else if (e.key === "Enter") next();
});

home();
