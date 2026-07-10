(() => {
  const root = document.documentElement;

  // Theme is pinned to graphite (clear any previously stored choice)
  root.setAttribute("data-theme", "graphite");
  try {
    localStorage.removeItem("portfolio_theme");
  } catch (e) {}

  // Reveal animations on scroll
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
      { threshold: 0.12 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Parallax
  const updateParallax = () => {
    const offset = Math.min(window.scrollY * 0.12, 120);
    const offsetTwo = Math.min(window.scrollY * 0.06, 80);
    root.style.setProperty("--parallax-y-1", `${offset}px`);
    root.style.setProperty("--parallax-y-2", `${offsetTwo}px`);
  };
  updateParallax();
  window.addEventListener("scroll", () => requestAnimationFrame(updateParallax));

  // Active nav link on scroll
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a");
  if (sections.length && navLinks.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => link.classList.remove("active"));
            const active = document.querySelector(`.nav-links a[href$="#${entry.target.id}"]`);
            if (active) active.classList.add("active");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  // Scroll-to-top button
  const scrollTopBtn = document.getElementById("scroll-top");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    });
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const formatNumber = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${value}`;
  };

  // Live GitHub repo stats
  const projectStats = document.querySelectorAll(".project-stats[data-github]");
  projectStats.forEach((node) => {
    const repo = node.getAttribute("data-github");
    if (!repo) return;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.message) return;
        const updated = new Date(data.updated_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        node.textContent = `★ ${formatNumber(data.stargazers_count)} · ${formatNumber(data.forks_count)} forks · Updated ${updated}`;
      })
      .catch(() => {
        node.remove();
      });
  });

  // GitHub user stats
  const githubStats = document.getElementById("github-stats");
  if (githubStats) {
    fetch("https://api.github.com/users/JakeBonnici22")
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.message) return;
        githubStats.textContent = `${formatNumber(data.followers)} followers · ${formatNumber(data.public_repos)} public repos`;
      })
      .catch(() => {
        githubStats.remove();
      });
  }
})();
