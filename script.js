(function () {
  const slides = Array.from(document.querySelectorAll(".slides > section"));
  const progress = document.getElementById("deckProgress");
  const slideCounter = document.getElementById("slideCounter");
  const roleTransition = document.getElementById("roleTransition");
  const roleTransitionText = roleTransition ? roleTransition.querySelector("span") : null;
  let fallbackIndex = 0;
  let revealActive = false;
  let lastTransitionIndex = -1;

  document.body.classList.remove("deck-loading");

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatNumber(value, opts = {}) {
    const decimals = Number(opts.decimals || 0);
    const fixed = Number(value).toFixed(decimals);
    const [whole, fraction] = fixed.split(".");
    const separated = opts.separator ? Number(whole).toLocaleString("en-US") : whole;
    return fraction ? `${separated}.${fraction}` : separated;
  }

  function animateCounters(scope) {
    const counters = scope.querySelectorAll("[data-counter]");
    counters.forEach((counter) => {
      const start = Number(counter.dataset.start || 0);
      const end = Number(counter.dataset.end || counter.textContent.replace(/[^\d.]/g, "") || 0);
      const decimals = Number(counter.dataset.decimals || 0);
      const separator = counter.dataset.separator === "true";
      const duration = 1200;
      const startedAt = performance.now();

      function tick(now) {
        const elapsed = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        const current = start + (end - start) * eased;
        counter.textContent = formatNumber(current, { decimals, separator });
        if (elapsed < 1) {
          requestAnimationFrame(tick);
        } else {
          counter.textContent = formatNumber(end, { decimals, separator });
        }
      }

      requestAnimationFrame(tick);
    });
  }

  function animateVisuals(scope) {
    scope.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.style.setProperty("--target-width", bar.dataset.width || "100%");
    });
    scope.querySelectorAll(".mini-gauge").forEach((gauge) => {
      gauge.style.setProperty("--pct", "0");
      requestAnimationFrame(() => {
        gauge.style.transition = "background 1s ease";
        gauge.style.setProperty("--pct", gauge.dataset.percent || "0");
      });
    });
  }

  function renderMermaidForSlide(scope) {
    if (!window.mermaid || scope.dataset.mermaidRendered === "true") return;
    const diagrams = Array.from(scope.querySelectorAll(".mermaid"));
    if (!diagrams.length) return;

    scope.dataset.mermaidRendered = "true";
    requestAnimationFrame(() => {
      setTimeout(() => {
        mermaid.run({ nodes: diagrams })
          .then(() => {
            const svg = scope.querySelector(".mermaid svg");
            const viewBox = svg ? svg.getAttribute("viewBox") : "";
            const parts = viewBox ? viewBox.split(/\s+/).map(Number) : [];
            const hasRealSize = parts.length === 4 && parts[2] > 100 && parts[3] > 80;
            if (hasRealSize) {
              document.body.classList.add("has-mermaid-rendered");
            } else {
              document.body.classList.add("no-mermaid");
            }
          })
          .catch(() => {
            document.body.classList.add("no-mermaid");
          });
      }, 80);
    });
  }

  function getActiveSlideIndex(eventSlide) {
    if (eventSlide) return slides.indexOf(eventSlide);
    if (revealActive && window.Reveal && typeof Reveal.getIndices === "function") {
      return Reveal.getIndices().h || 0;
    }
    return fallbackIndex;
  }

  function updateChrome(index) {
    const total = slides.length || 1;
    const safeIndex = Math.max(0, Math.min(index, total - 1));
    const slide = slides[safeIndex];
    progress.style.width = `${((safeIndex + 1) / total) * 100}%`;
    slideCounter.textContent = `${pad(safeIndex + 1)} / ${pad(total)}`;
    updateRoleClass(slide);
  }

  function updateRoleClass(slide) {
    document.body.classList.remove("role-david", "role-luis", "role-walder", "role-francisco");
    if (!slide) return;
    if (slide.classList.contains("owner-david")) document.body.classList.add("role-david");
    if (slide.classList.contains("owner-luis")) document.body.classList.add("role-luis");
    if (slide.classList.contains("owner-walder")) document.body.classList.add("role-walder");
    if (slide.classList.contains("owner-francisco")) document.body.classList.add("role-francisco");
  }

  function showRoleTransition(text, index) {
    if (!roleTransition || !roleTransitionText || !text || lastTransitionIndex === index) return;
    lastTransitionIndex = index;
    roleTransitionText.textContent = text;
    roleTransition.classList.remove("is-active");
    void roleTransition.offsetWidth;
    roleTransition.classList.add("is-active");
    window.setTimeout(() => {
      roleTransition.classList.remove("is-active");
    }, 980);
  }

  function activateSlide(index, eventSlide) {
    const slide = eventSlide || slides[index];
    if (!slide) return;
    slide.classList.add("seen");
    updateRoleClass(slide);
    animateCounters(slide);
    animateVisuals(slide);
    renderMermaidForSlide(slide);
    updateChrome(index);
    showRoleTransition(slide.dataset.transitionLabel, index);
  }

  function setFallbackSlide(index) {
    fallbackIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active-fallback", slideIndex === fallbackIndex);
    });
    activateSlide(fallbackIndex);
  }

  function initMermaid() {
    if (!window.mermaid) {
      document.body.classList.add("no-mermaid");
      return;
    }

    document.body.classList.add("has-mermaid");
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        background: "#050816",
        primaryColor: "#0B1020",
        primaryTextColor: "#F8FAFC",
        primaryBorderColor: "#2563EB",
        lineColor: "#00E5FF",
        secondaryColor: "#111827",
        tertiaryColor: "#172554"
      }
    });
  }

  function initReveal() {
    if (!window.Reveal) {
      document.body.classList.add("reveal-unavailable");
      setFallbackSlide(0);
      return;
    }

    revealActive = true;
    document.body.classList.add("reveal-available");
    Reveal.initialize({
      hash: true,
      controls: false,
      progress: false,
      slideNumber: false,
      center: false,
      width: 1600,
      height: 900,
      margin: 0.005,
      minScale: 0.2,
      maxScale: 1.65,
      transition: "fade",
      backgroundTransition: "fade"
    });

    Reveal.on("ready", (event) => {
      activateSlide(getActiveSlideIndex(event.currentSlide), event.currentSlide);
    });

    Reveal.on("slidechanged", (event) => {
      activateSlide(getActiveSlideIndex(event.currentSlide), event.currentSlide);
    });
  }

  function initEvents() {
    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (!revealActive) {
        if (["arrowright", "pagedown", " "].includes(key)) {
          event.preventDefault();
          setFallbackSlide(fallbackIndex + 1);
        }
        if (["arrowleft", "pageup"].includes(key)) {
          event.preventDefault();
          setFallbackSlide(fallbackIndex - 1);
        }
      }
    });
  }

  function initNetworkCanvas() {
    const canvas = document.getElementById("networkCanvas");
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = [];
    const particleCount = reduced ? 34 : 96;
    const linkDistance = reduced ? 140 : 178;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        const highlighted = Math.random() > 0.7;
        const toneRoll = Math.random();
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * (highlighted ? 0.18 : 0.26),
          vy: (Math.random() - 0.5) * (highlighted ? 0.18 : 0.26),
          r: highlighted ? Math.random() * 2.2 + 1.7 : Math.random() * 1.9 + 0.9,
          glow: highlighted,
          tone: toneRoll > 0.91 ? "danger" : toneRoll > 0.82 ? "success" : "cyan"
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const crisisTone = document.body.classList.contains("role-francisco");
      const successTone = document.body.classList.contains("role-luis") || document.body.classList.contains("role-walder");
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (!reduced) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
          if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
        }

        if (p.glow) {
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
          const haloColor = crisisTone && p.tone === "danger"
            ? "rgba(239, 68, 68, 0.24)"
            : successTone && p.tone === "success"
              ? "rgba(34, 197, 94, 0.22)"
              : "rgba(0, 229, 255, 0.26)";
          halo.addColorStop(0, haloColor);
          halo.addColorStop(1, "rgba(0, 229, 255, 0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 7.5, 0, Math.PI * 2);
          ctx.fill();
        }

        const pointTone = crisisTone && p.tone === "danger"
          ? "rgba(239, 68, 68, 0.72)"
          : successTone && p.tone === "success"
            ? "rgba(34, 197, 94, 0.68)"
            : p.glow
              ? "rgba(0, 229, 255, 0.9)"
              : "rgba(0, 229, 255, 0.65)";
        ctx.shadowBlur = p.glow ? 10 : 0;
        ctx.shadowColor = pointTone;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = pointTone;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j += 1) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDistance) {
            const alpha = (p.glow || q.glow ? 0.34 : 0.28) * (1 - dist / linkDistance);
            ctx.strokeStyle = crisisTone && (p.tone === "danger" || q.tone === "danger")
              ? `rgba(239, 68, 68, ${alpha * 0.86})`
              : successTone && (p.tone === "success" || q.tone === "success")
                ? `rgba(34, 197, 94, ${alpha * 0.72})`
                : `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = p.glow || q.glow ? 1.15 : 0.9;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      if (!reduced) requestAnimationFrame(draw);
    }

    resize();
    seed();
    draw();
    window.addEventListener("resize", () => {
      resize();
      seed();
    });
  }

  initEvents();
  initMermaid();
  initReveal();
  initNetworkCanvas();
  updateChrome(0);
})();
