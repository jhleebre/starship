// DOM side of the game: HUD gauges, banner, menu and result overlays.
// Elements are defined in index.html; this module only fills and toggles them.
const $ = id => document.getElementById(id);

export const fmt = t => t === undefined ? '—' : t.toFixed(2);

const els = { prog: $('prog'), time: $('timeTxt'), spd: $('spdBar'), fuel: $('fuelBar') };

/** progress 0..1, speed 0..1, fuel 0..100 */
export function updateHud(progress, time, speed, fuel) {
  els.prog.style.width = Math.min(100, progress * 100) + '%';
  els.time.textContent = fmt(time);
  els.spd.style.width = Math.min(100, Math.max(0, speed) * 100) + '%';
  els.fuel.style.width = fuel + '%';
  els.fuel.classList.toggle('low', fuel < 25);
}

export function setLevelChip(text) { $('lvChip').textContent = text; }
export function setMuteLabel(muted) { $('muteBtn').textContent = muted ? '소리 끔' : '소리 켬'; }

let bannerT = null;
export function showBanner(title, sub) {
  $('bannerTitle').textContent = title; $('bannerSub').textContent = sub;
  const b = $('banner'); b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 2300);
}

export function hideOverlays() { $('menu').classList.remove('show'); $('result').classList.remove('show'); }

// Result card: {title, sub, stat (html), main:[label, fn], alt:[label, fn]}
let res = null;
export function showResult(o) {
  $('resTitle').textContent = o.title; $('resSub').textContent = o.sub; $('resStat').innerHTML = o.stat || '';
  $('resMain').textContent = o.main[0]; $('resAlt').textContent = o.alt[0]; $('resHint').textContent = o.main[0];
  $('resAlt').style.display = o.alt[0] ? '' : 'none';
  res = o;
  $('result').classList.add('show');
}
export function hideResult() { $('result').classList.remove('show'); }
/** Runs the result card's main button (Space/Enter). */
export function resultMain() { if (res) res.main[1](); }
$('resMain').onclick = () => res && res.main[1]();
$('resAlt').onclick = () => res && res.alt[1] && res.alt[1]();

/** Level select. levels: list, save: {unlocked,best}, sel: highlighted index. */
export function showMenu(levels, save, sel, onPick) {
  renderLevels(levels, save, sel, onPick);
  $('result').classList.remove('show');
  $('menu').classList.add('show');
}
export function renderLevels(levels, save, sel, onPick) {
  const box = $('levels'); box.innerHTML = '';
  levels.forEach((lv, i) => {
    const b = document.createElement('button');
    b.className = 'lv' + (i === sel ? ' sel' : '');
    b.disabled = i >= save.unlocked;
    const best = save.best[i];
    b.innerHTML = `${i + 1}. ${lv.name}<small>${b.disabled ? '잠김' : best !== undefined ? '최고 ' + fmt(best) + '초' : '아직 기록 없음'}</small>`;
    b.onclick = () => onPick(i);
    box.appendChild(b);
  });
}

/** Wires the HUD buttons. */
export function bindHud({ onMenu, onMute, onResultMenu }) {
  $('menuBtn').onclick = onMenu;
  $('muteBtn').onclick = onMute;
  $('resMenu').onclick = onResultMenu;
}
