(() => {
  const root = document.documentElement;
  const storageKey = "portfolio_theme";
  const themes = ["graphite", "executive", "minimal"];

  const applyTheme = (theme) => {
    if (!theme) return;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(storageKey, theme);
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      const label = theme.charAt(0).toUpperCase() + theme.slice(1);
      toggle.textContent = `Theme: ${label}`;
    }
  };

  const stored = localStorage.getItem(storageKey);
  if (stored) {
    applyTheme(stored);
  } else {
    const current = root.getAttribute("data-theme");
    applyTheme(current || themes[0]);
  }

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || themes[0];
      const index = themes.indexOf(current);
      const next = themes[(index + 1) % themes.length];
      applyTheme(next);
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const updateParallax = () => {
    const offset = Math.min(window.scrollY * 0.12, 120);
    const offsetTwo = Math.min(window.scrollY * 0.06, 80);
    root.style.setProperty("--parallax-y-1", `${offset}px`);
    root.style.setProperty("--parallax-y-2", `${offsetTwo}px`);
  };
  updateParallax();
  window.addEventListener("scroll", () => requestAnimationFrame(updateParallax));

  const formatNumber = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${value}`;
  };

  const projectStats = document.querySelectorAll(".project-stats[data-github]");
  projectStats.forEach((node) => {
    const repo = node.getAttribute("data-github");
    if (!repo) return;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.message) return;
        node.textContent = `★ ${formatNumber(data.stargazers_count)} · Forks ${formatNumber(data.forks_count)} · Updated ${new Date(data.updated_at).toLocaleDateString()}`;
      })
      .catch(() => {
        node.textContent = "Live stats unavailable";
      });
  });

  const githubStats = document.getElementById("github-stats");
  if (githubStats) {
    fetch("https://api.github.com/users/JakeBonnici22")
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.message) return;
        githubStats.textContent = `GitHub: ${formatNumber(data.followers)} followers · ${formatNumber(data.public_repos)} public repos`;
      })
      .catch(() => {
        githubStats.textContent = "GitHub stats unavailable";
      });
  }
})();
