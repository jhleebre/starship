// Turns keyboard and touch input into named actions. The game decides what an
// action means in its current mode.
//   held directions: 'left' 'right' 'up' 'down'
//   presses:         'primary' (Space / touch jump), 'confirm' (Enter),
//                    'restart' (R), 'pause' (Esc / P), 'mute' (M)
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'primary', Enter: 'confirm', KeyR: 'restart', Escape: 'pause', KeyP: 'pause', KeyM: 'mute',
};

/**
 * onAction(name, down, repeat): every mapped key press/release.
 * onBlur(): window lost focus (release everything).
 */
export function bindInput({ onAction, onBlur }) {
  window.addEventListener('keydown', e => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (a !== 'pause' && a !== 'mute') e.preventDefault();
    onAction(a, true, e.repeat);
  });
  window.addEventListener('keyup', e => {
    const a = KEYMAP[e.code];
    if (a) onAction(a, false, false);
  });
  window.addEventListener('blur', onBlur);

  // On-screen pad (shown on touch devices); data-k holds the action name
  document.querySelectorAll('.tb').forEach(b => {
    const a = b.dataset.k === 'jump' ? 'primary' : b.dataset.k;
    const down = e => {
      e.preventDefault();
      if (b.setPointerCapture) b.setPointerCapture(e.pointerId);
      b.classList.add('on');
      onAction(a, true, false);
    };
    const up = () => {
      if (!b.classList.contains('on')) return;
      b.classList.remove('on');
      onAction(a, false, false);
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });
}
