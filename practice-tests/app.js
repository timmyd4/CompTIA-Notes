const app = document.getElementById("app");
const SUBJECTS = [...new Set(Q.map(q => q.s))];
const LETTERS = "ABCD";
let state = null;

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function home() {
  state = null;
  app.innerHTML = `
    <h1>CompTIA A+ Core 1 (220-1201) Practice</h1>
    <div class="muted">${Q.length} questions. Order and answer choices are shuffled every run.</div>
    <div class="card">
      <strong>Subjects</strong>
      ${SUBJECTS.map(s => `<label class="sub"><span><input type="checkbox" value="${esc(s)}" checked>${esc(s)}</span><span class="muted">${Q.filter(q => q.s === s).length}</span></label>`).join("")}
      <div class="row">
        <button class="ghost" id="all">All</button><button class="ghost" id="none">None</button>
      </div>
      <div class="row">
        <label>Questions: <select id="count">
          <option value="10">10</option><option value="25">25</option><option value="50" selected>50</option>
          <option value="90">90 (exam length)</option><option value="0">All selected</option>
        </select></label>
        <label><input type="checkbox" id="instant" checked> Show answer immediately</label>
      </div>
      <div class="row"><button id="start">Start test</button></div>
    </div>`;
  const boxes = [...app.querySelectorAll(".sub input")];
  app.querySelector("#all").onclick = () => boxes.forEach(b => b.checked = true);
  app.querySelector("#none").onclick = () => boxes.forEach(b => b.checked = false);
  app.querySelector("#start").onclick = () => {
    const picked = boxes.filter(b => b.checked).map(b => b.value);
    if (!picked.length) return alert("Pick at least one subject.");
    const n = +app.querySelector("#count").value;
    let pool = shuffle(Q.filter(q => picked.includes(q.s)));
    if (n) pool = pool.slice(0, n);
    start(pool, app.querySelector("#instant").checked);
  };
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
  const k = e.key.toLowerCase();
  const idx = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "abcd".indexOf(k);
  if (idx >= 0 && idx < state.items[state.i].choices.length) choose(idx);
  else if (e.key === "Enter") next();
});

home();
