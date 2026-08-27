export const Input = { keys: {}, pressed: {} };

const PREVENT_DEFAULT_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// Attaches the window-level key listeners. Called from the GameCanvas
// component's useEffect (client-side only, never during SSR) and returns a
// cleanup function to remove them on unmount.
export function initInput() {
  const onKeyDown = e => {
    if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
    if (!Input.keys[e.code]) Input.pressed[e.code] = true;
    Input.keys[e.code] = true;
  };
  const onKeyUp = e => {
    Input.keys[e.code] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}

export function consumePressed(code) {
  return !!Input.pressed[code];
}

// Called once per frame after update() so "just pressed" flags only live
// for a single frame, regardless of who checked (or didn't check) them.
export function clearFramePressed() {
  Input.pressed = {};
}
