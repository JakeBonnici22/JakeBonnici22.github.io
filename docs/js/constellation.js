/* Interactive constellation — cursor-reactive node network in the hero.
   Dependency-free, theme-aware, respects prefers-reduced-motion. */
(() => {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "hero-canvas";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, dpr = 1;
  let nodes = [];
  let pulses = [];
  const mouse = { x: -9999, y: -9999, active: false };
  let running = false;
  let rafId = null;

  // Theme-aware colors, re-read when data-theme changes
  let cNode = "#5b8cff", cLink = "#5b8cff", cAccent = "#c9a227";
  function readTheme() {
    const s = getComputedStyle(document.documentElement);
    cNode = (s.getPropertyValue("--accent-2") || cNode).trim();
    cAccent = (s.getPropertyValue("--accent") || cAccent).trim();
    cLink = cNode;
  }
  readTheme();
  new MutationObserver(readTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  function resize() {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const target = Math.max(28, Math.min(80, Math.round((W * H) / 16000)));
    nodes = Array.from({ length: target }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 1.6,
    }));
  }

  const LINK_D = 120;
  const MOUSE_D = 190;

  function hexA(hex, a) {
    // hex -> rgba string (handles #rgb and #rrggbb)
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // move
    for (const n of nodes) {
      // gentle cursor attraction
      if (mouse.active) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_D && d > 24) {
          n.vx += (dx / d) * 0.012;
          n.vy += (dy / d) * 0.012;
        }
      }
      // pulse impulse
      for (const p of pulses) {
        const dx = n.x - p.x, dy = n.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const ring = p.age * 3.2;
        if (Math.abs(d - ring) < 26) {
          n.vx += (dx / d) * 0.55;
          n.vy += (dy / d) * 0.55;
        }
      }
      // speed cap + damping
      n.vx *= 0.985; n.vy *= 0.985;
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > 0.9) { n.vx = (n.vx / sp) * 0.9; n.vy = (n.vy / sp) * 0.9; }
      if (sp < 0.08) { n.vx += (Math.random() - 0.5) * 0.04; n.vy += (Math.random() - 0.5) * 0.04; }
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
    }

    // node-node links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_D * LINK_D) {
          const t = 1 - Math.sqrt(d2) / LINK_D;
          ctx.strokeStyle = hexA(cLink, 0.16 * t);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // cursor links (gold, brighter)
    if (mouse.active) {
      for (const n of nodes) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_D) {
          const t = 1 - d / MOUSE_D;
          ctx.strokeStyle = hexA(cAccent, 0.35 * t);
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const n of nodes) {
      ctx.fillStyle = hexA(cNode, 0.55);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // pulses (expanding rings on click)
    pulses = pulses.filter((p) => p.age < 90);
    for (const p of pulses) {
      p.age++;
      const ring = p.age * 3.2;
      ctx.strokeStyle = hexA(cAccent, Math.max(0, 0.5 * (1 - p.age / 90)));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
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

  // pause when hero is off-screen or tab hidden
  new IntersectionObserver(
    (entries) => (entries[0].isIntersecting && !document.hidden ? start() : stop()),
    { threshold: 0.05 }
  ).observe(hero);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start()
  );

  window.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active =
      mouse.x >= 0 && mouse.x <= r.width && mouse.y >= 0 && mouse.y <= r.height;
  });
  window.addEventListener("mouseout", () => (mouse.active = false));
  hero.addEventListener("click", (e) => {
    // don't fire pulses for clicks on links/buttons
    if (e.target.closest("a, button")) return;
    const r = hero.getBoundingClientRect();
    pulses.push({ x: e.clientX - r.left, y: e.clientY - r.top, age: 0 });
  });

  let rT;
  window.addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(resize, 150);
  });

  resize();
})();
