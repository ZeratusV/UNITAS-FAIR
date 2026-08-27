const Input = { keys: {}, pressed: {} };

const PREVENT_DEFAULT_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

window.addEventListener('keydown', e => {
  if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
  if (!Input.keys[e.code]) Input.pressed[e.code] = true;
  Input.keys[e.code] = true;
});

window.addEventListener('keyup', e => {
  Input.keys[e.code] = false;
});

function consumePressed(code) {
  return !!Input.pressed[code];
}

// Called once per frame after update() so "just pressed" flags only live
// for a single frame, regardless of who checked (or didn't check) them.
function clearFramePressed() {
  Input.pressed = {};
}
