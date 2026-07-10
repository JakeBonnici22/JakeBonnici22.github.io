/* Interactive constellation — full-page, cursor-reactive node network.
   Fixed background layer behind all content. Dependency-free, theme-aware,
   respects prefers-reduced-motion. */
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  // Critical layout inline so the effect never depends on stylesheet delivery.
  // Content (main/header/footer) sits at z-index 1; this stays behind it.
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "0",
    pointerEvents: "none",
  });
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  let nodes = [];
  let pulses = [];
  const mouse = { x: -9999, y: -9999, active: false };
  let running = false;
  let rafId = null;
  let lastScrollY = window.scrollY;

  // Interaction tuning
  const LINK_D = 130;    // node-node link distance
  const MOUSE_D = 240;   // cursor influence radius
  const ATTRACT = 0.028; // cursor pull strength
  const SCROLL_PARALLAX = 0.06; // node drift per scrolled px

  // Theme-aware colors (read once; theme is pinned to graphite)
  let cNode = "#5b8cff", cAccent = "#c9a227";
  (function readTheme() {
    const s = getComputedStyle(document.documentElement);
    cNode = (s.getPropertyValue("--accent-2") || cNode).trim();
    cAccent = (s.getPropertyValue("--accent") || cAccent).trim();
  })();

  function hexA(hex, a) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function seed() {
    const target = Math.max(35, Math.min(95, Math.round((W * H) / 15000)));
    nodes = Array.from({ length: target }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1.1 + Math.random() * 1.5,
    }));
  }

  function resize(reseed) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const widthChanged = Math.abs(w - W) > 2;
    const heightJump = Math.abs(h - H) > 160;
    W = w; H = h;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Only reseed on real layout changes — not mobile URL-bar height jitter
    if (reseed || widthChanged || heightJump || !nodes.length) seed();
  }

  function wrap(n) {
    if (n.x < -24) n.x = W + 24; else if (n.x > W + 24) n.x = -24;
    if (n.y < -24) n.y = H + 24; else if (n.y > H + 24) n.y = -24;
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      // proximity-scaled cursor attraction: stronger as you get closer
      if (mouse.active) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_D && d > 26) {
          const t = 1 - d / MOUSE_D;
          n.vx += (dx / d) * ATTRACT * t;
          n.vy += (dy / d) * ATTRACT * t;
        }
      }
      // click pulse shockwave
      for (const p of pulses) {
        const dx = n.x - p.x, dy = n.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const ring = p.age * 3.4;
        if (Math.abs(d - ring) < 28) {
          n.vx += (dx / d) * 0.5;
          n.vy += (dy / d) * 0.5;
        }
      }
      // damping, speed cap, idle jitter
      n.vx *= 0.984; n.vy *= 0.984;
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > 1.0) { n.vx = (n.vx / sp); n.vy = (n.vy / sp); }
      if (sp < 0.07) {
        n.vx += (Math.random() - 0.5) * 0.05;
        n.vy += (Math.random() - 0.5) * 0.05;
      }
      n.x += n.vx; n.y += n.vy;
      wrap(n);
    }

    // node-node links
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_D * LINK_D) {
          const t = 1 - Math.sqrt(d2) / LINK_D;
          ctx.strokeStyle = hexA(cNode, 0.14 * t);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // cursor: gold links + glowing hub
    if (mouse.active) {
      for (const n of nodes) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_D) {
          const t = 1 - d / MOUSE_D;
          ctx.strokeStyle = hexA(cAccent, 0.38 * t);
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 26);
      grad.addColorStop(0, hexA(cAccent, 0.28));
      grad.addColorStop(1, hexA(cAccent, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // nodes (brighter + larger near cursor)
    for (const n of nodes) {
      let r = n.r, alpha = 0.5;
      if (mouse.active) {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < MOUSE_D) {
          const t = 1 - d / MOUSE_D;
          r = n.r * (1 + 0.7 * t);
          alpha = 0.5 + 0.4 * t;
        }
      }
      ctx.fillStyle = hexA(cNode, alpha);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // click pulses
    pulses = pulses.filter((p) => p.age < 85);
    for (const p of pulses) {
      p.age++;
      ctx.strokeStyle = hexA(cAccent, Math.max(0, 0.45 * (1 - p.age / 85)));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.age * 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (running) rafId = requestAnimationFrame(step);
  }

  function start() {
    if (!running) { running = true; rafId = requestAnimationFrame(step); }
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start()
  );

  // cursor position is viewport-relative — matches the fixed canvas directly
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.addEventListener("mouseleave", () => (mouse.active = false));

  // click pulse anywhere except on interactive elements
  window.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, textarea, select, label")) return;
    pulses.push({ x: e.clientX, y: e.clientY, age: 0 });
  });

  // subtle scroll parallax: the field drifts as you move through the page
  window.addEventListener(
    "scroll",
    () => {
      const dy = (window.scrollY - lastScrollY) * SCROLL_PARALLAX;
      lastScrollY = window.scrollY;
      if (!dy) return;
      for (const n of nodes) {
        n.y -= dy;
        wrap(n);
      }
    },
    { passive: true }
  );

  let rT;
  window.addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => resize(false), 150);
  });

  resize(true);
  start();
})();
