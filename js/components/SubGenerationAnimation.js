// ============================================================
// SubGenerationAnimation — fullscreen overlay shown while a sub
// lesson is being generated. Uses an animated canvas + rotating
// encouraging messages to make the wait feel purposeful.
// Depends on: nothing (pure React + CSS)
// ============================================================

// useState alias must be declared before use (Babel IIFE scope)
const { useState: useState_anim, useEffect: useEffect_anim, useRef: useRef_anim } = React;

window.SubGenerationAnimation = function SubGenerationAnimation({ language = "sv" }) {

  const messagesSv = [
    "Analyserar läroplanen för optimalt innehåll…",
    "Skapar ett engagerande lektionsupplägg…",
    "Skriver tydliga steg-för-steg-instruktioner…",
    "Förbereder klassrumshanteringstips…",
    "Lägger till roliga och aktiva moment…",
    "Skräddarsyr för vikariens behov…",
    "Bygger in extramaterial om tid finns kvar…",
    "Kvalitetsgranskar instruktionerna…",
    "Nästan klart — sista finslipningen…",
  ];
  const messagesEn = [
    "Analysing the curriculum for optimal content…",
    "Crafting an engaging lesson structure…",
    "Writing clear step-by-step instructions…",
    "Preparing classroom management tips…",
    "Adding fun and active learning moments…",
    "Tailoring everything for the substitute's needs…",
    "Building in extra activities for spare time…",
    "Quality-checking all instructions…",
    "Almost done — final polish…",
  ];

  const messages = language === "sv" ? messagesSv : messagesEn;
  const [msgIdx, setMsgIdx] = useState_anim(0);
  const [fadeIn, setFadeIn] = useState_anim(true);
  const canvasRef = useRef_anim(null);
  const animRef = useRef_anim(null);
  const tickRef = useRef_anim(0);

  // Rotate messages
  useEffect_anim(() => {
    const id = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setFadeIn(true);
      }, 300);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // Canvas animation — animated "lesson plan" building up
  useEffect_anim(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = 320;
    const H = canvas.height = 220;

    // Theme colors (CSS vars not available in canvas, use approximate)
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const bg      = isDark ? "#1A1A1A" : "#FFFFFF";
    const line    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
    const accent  = "#2B5F8B";
    const yellow  = "#F5C518";
    const text    = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

    // Define "rows" that animate in — simulating lesson plan sections
    const rows = [
      { y: 22,  w: 180, h: 10, color: accent,  delay: 0   }, // title
      { y: 40,  w: 100, h: 6,  color: text,     delay: 8   }, // subtitle
      { y: 58,  w: 240, h: 5,  color: text,     delay: 18  }, // line 1
      { y: 68,  w: 210, h: 5,  color: text,     delay: 22  }, // line 2
      { y: 78,  w: 230, h: 5,  color: text,     delay: 26  }, // line 3
      { y: 96,  w: 80,  h: 7,  color: accent,   delay: 36  }, // section header
      { y: 112, w: 11,  h: 11, color: yellow,   delay: 44  }, // phase 1 dot
      { y: 110, w: 160, h: 5,  color: text,     delay: 44, x: 28 },
      { y: 120, w: 130, h: 5,  color: text,     delay: 48, x: 28 },
      { y: 136, w: 11,  h: 11, color: yellow,   delay: 54  }, // phase 2 dot
      { y: 134, w: 180, h: 5,  color: text,     delay: 54, x: 28 },
      { y: 144, w: 140, h: 5,  color: text,     delay: 58, x: 28 },
      { y: 160, w: 11,  h: 11, color: accent,   delay: 66  }, // phase 3 dot
      { y: 158, w: 200, h: 5,  color: text,     delay: 66, x: 28 },
      { y: 168, w: 160, h: 5,  color: text,     delay: 70, x: 28 },
      { y: 186, w: 70,  h: 7,  color: accent,   delay: 80  }, // footer label
      { y: 200, w: 260, h: 5,  color: text,     delay: 86  },
    ];

    const TOTAL = 120; // frames for one full "build"

    function draw(tick) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // Subtle border
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 10);
      ctx.stroke();

      const t = tick % TOTAL;

      rows.forEach(row => {
        const progress = Math.max(0, Math.min(1, (t - row.delay) / 12));
        if (progress <= 0) return;
        const x = (row.x || 16);
        const drawW = row.w * progress;
        ctx.fillStyle = row.color;
        const r = Math.min(3, row.h / 2);
        ctx.beginPath();
        ctx.roundRect(x, row.y, drawW, row.h, r);
        ctx.fill();
      });

      // Blinking cursor after last drawn row
      const lastDriven = rows.findLast(r => (t - r.delay) > 0);
      if (lastDriven) {
        const cursorRow = rows.findIndex(r => r === lastDriven);
        const nextRow = rows[cursorRow + 1];
        if (nextRow) {
          const cx = (nextRow.x || 16);
          const cy = nextRow.y;
          const blink = Math.sin(tick * 0.18) > 0;
          if (blink) {
            ctx.fillStyle = accent;
            ctx.fillRect(cx, cy, 2, nextRow.h);
          }
        }
      }
    }

    function loop() {
      tickRef.current++;
      draw(tickRef.current);
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const heading = language === "sv"
    ? "Skapar din vikarielektion…"
    : "Creating your substitute lesson…";
  const subheading = language === "sv"
    ? "Vi bygger en komplett, lättföljd plan optimerad för vikarie."
    : "Building a complete, easy-to-follow plan optimised for substitutes.";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(3px)",
    }}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: 16,
        padding: "32px 36px",
        maxWidth: 420, width: "90%",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        {/* Animated canvas */}
        <div style={{ position: "relative" }}>
          <canvas ref={canvasRef} style={{ borderRadius: 10, display: "block" }} />
          {/* Shimmer overlay */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 10,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.8s ease-in-out infinite",
          }} />
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{heading}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>{subheading}</div>
          {/* Rotating message */}
          <div style={{
            fontSize: 12, color: "var(--accent)", fontWeight: 500,
            minHeight: 18,
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}>
            {messages[msgIdx]}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--accent)",
              animation: `dot-pulse 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};
