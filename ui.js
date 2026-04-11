/* =========================================================
   UI HELPERS & MODAL
   ========================================================= */

function showPracticeCompleteModal(wpm, kpc, streakVal) {
  document.getElementById("practcomp-wpm").textContent    = wpm      ?? "—";
  document.getElementById("practcomp-kpc").textContent    = kpc      ?? "—";
  document.getElementById("practcomp-streak").textContent = streakVal ?? "—";
  // Reset copy button in case it was used before
  const btn = document.getElementById("practcomp-copy-btn");
  btn.textContent = "copy my score to clipboard";
  btn.classList.remove("copied");
  document.getElementById("practice-complete-modal").classList.remove("hidden");
}

function dismissPracticeCompleteModal() {
  document.getElementById("practice-complete-modal").classList.add("hidden");
}

function copyScoreToClipboard() {
  const wpm    = document.getElementById("practcomp-wpm").textContent;
  const kpc    = document.getElementById("practcomp-kpc").textContent;
  const streak = document.getElementById("practcomp-streak").textContent;
  const text   = `fingerboard champion: ${wpm}wpm, ${kpc}kpc, ${streak} streak\nhttps://BrayBuch.github.io/FingerBoard/`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById("practcomp-copy-btn");
    btn.textContent = "copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "copy my score to clipboard";
      btn.classList.remove("copied");
    }, 2000);
  });
}

function showTutorialCompleteModal(wpm, kpc, streakVal) {
  document.getElementById("tutcomp-wpm").textContent    = wpm      ?? "—";
  document.getElementById("tutcomp-kpc").textContent    = kpc      ?? "—";
  document.getElementById("tutcomp-streak").textContent = streakVal ?? "—";
  document.getElementById("tutorial-complete-modal").classList.remove("hidden");
}

function dismissTutorialCompleteModal() {
  document.getElementById("tutorial-complete-modal").classList.add("hidden");
}

function showWelcomeModal() {
  document.getElementById("welcome-modal").classList.remove("hidden");
  // Reset to slide 0 each time modal opens
  modalGoTo(0);
}

function dismissWelcomeModal() {
  document.getElementById("welcome-modal").classList.add("hidden");
  morphStop();
}

/* ── Modal carousel ── */
let currentModalSlide = 0;
const MODAL_SLIDE_COUNT = 2;

function modalGoTo(n) {
  // Hide old slide
  const oldSlide = document.getElementById("mslide-" + currentModalSlide);
  if (oldSlide) oldSlide.classList.remove("active");
  const oldDot = document.getElementById("mdot-" + currentModalSlide);
  if (oldDot) oldDot.classList.remove("active");

  currentModalSlide = n;

  // Show new slide
  const newSlide = document.getElementById("mslide-" + n);
  if (newSlide) newSlide.classList.add("active");
  const newDot = document.getElementById("mdot-" + n);
  if (newDot) newDot.classList.add("active");

  // Kick off morph when landing on slide 2
  // Kick off demo when landing on slide 3
  if (n === 1) {
    setTimeout(morphInit, 120);
  } if (n=== 2) {
    setTimeout(startModalDemo, 120);
  } else {
    morphStop();
  }
}

/* ============================================================
   QWERTY → FINGERBOARD MORPH (desktop + mobile corrected)
   ============================================================ */
const GROUP_COLORS = ["#7c6fcd","#5c9e6e","#c06060","#c09030"];
const GROUP_DELAY  = 0.18;

let morphKeys = [];
let morphProgress = 0;
let morphForward = true;
let morphRaf = null;
let morphLastTs = null;
let morphAutoTimer = null;

function morphEase(t) {
  return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
}

function morphBuildKeys(W, H) {
  morphKeys = [];

  const mobile = W < 700;
  const scale = mobile
    ? Math.max(0.62, Math.min(0.82, W / 520))
    : Math.max(0.82, Math.min(1, W / 520));

  const keyW = 26 * scale;
  const gap = 4 * scale;

  const row1 = ["q","w","e","r","t","y","u","i","o","p"];
  const row2 = ["a","s","d","f","g","h","j","k","l"];
  const row3 = ["z","x","c","v","b","n","m"];

  const totalW = row1.length * keyW + (row1.length - 1) * gap;
  const sx = (W - totalW) / 2;
  const sy = mobile ? H * 0.08 : H * 0.12;

  const groupOf = {
    q:0,w:0,e:0,r:0,t:0,y:0,u:0,
    a:1,s:1,d:1,f:1,g:1,h:1,j:1,
    z:2,x:2,c:2,v:2,b:2,n:2,m:2,
    i:3,o:3,p:3,k:3,l:3
  };

  function addRow(letters, offX, offY) {
    letters.forEach((ch, i) => {
      morphKeys.push({
        text: ch,
        x: sx + offX + i*(keyW+gap),
        y: sy + offY,
        startX: sx + offX + i*(keyW+gap),
        startY: sy + offY,
        targetX: 0,
        targetY: 0,
        group: groupOf[ch]
      });
    });
  }

  addRow(row1, 0, 0);
  addRow(row2, 14 * scale, 38 * scale);
  addRow(row3, 38 * scale, 76 * scale);

/* FINAL SINGLE HORIZONTAL ROW — COMPACT + HIGHER */
const clusterW = mobile ? 62 * scale : 72 * scale;
const clusterH = mobile ? 42 * scale : 48 * scale;

const clusterGapX = mobile ? 16 * scale : 22 * scale;

/* Four groups in one row */
const totalRowW = clusterW * 4 + clusterGapX * 3;

/* Center horizontally */
const rowStartX = (W - totalRowW) / 2;

/* Raise final resting position so it overlaps original keyboard area */
const rowY = mobile
  ? H * 0.34
  : H * 0.38;

const clusterPos = [
  [rowStartX, rowY],
  [rowStartX + (clusterW + clusterGapX) * 1, rowY],
  [rowStartX + (clusterW + clusterGapX) * 2, rowY],
  [rowStartX + (clusterW + clusterGapX) * 3, rowY]
];

  const layout = {
    0: [["q","w","e","r"],["t","y","u"]],
    1: [["a","s","d","f"],["g","h","j"]],
    2: [["z","x","c","v"],["b","n","m"]],
    3: [["i","o","p"],["k","l"]]
  };

  morphKeys.forEach(k => {
    const group = k.group;
    const [cx, cy] = clusterPos[group];
    const rows = layout[group];

    rows.forEach((row, r) => {
      row.forEach((letter, c) => {
        if (letter === k.text) {
          k.targetX = cx + c * (18 * scale);
          k.targetY = cy + r * (20 * scale);
        }
      });
    });
  });
}

function morphInit() {
  const canvas = document.getElementById("morph-canvas");
  if (!canvas) return;

  const W = canvas.offsetWidth || 520;
  const PR = window.devicePixelRatio || 1;
  const mobile = window.innerWidth < 700;

  const canvasHeight = mobile ? 150 : 90;

  canvas.width = W * PR;
  canvas.height = canvasHeight * PR;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(PR, 0, 0, PR, 0, 0);

  morphBuildKeys(W, canvasHeight);

  morphProgress = 0;
  morphForward = true;
  morphLastTs = null;

  morphDraw(W, canvasHeight);

  clearTimeout(morphAutoTimer);
  morphAutoTimer = setTimeout(() => morphAnimate(W, canvasHeight), 600);
}

function morphAnimate(W, H) {
  if (morphRaf) cancelAnimationFrame(morphRaf);

  const maxP = 1 + GROUP_DELAY * 3;

  const step = (ts) => {
    if (!morphLastTs) morphLastTs = ts;
    const dt = (ts - morphLastTs) / 1000;
    morphLastTs = ts;

    morphProgress += dt * 0.65;

    if (morphProgress >= maxP) {
      morphProgress = maxP;
      morphDraw(W, H);

      morphAutoTimer = setTimeout(() => {
        morphKeys.forEach(k => {
          [k.startX, k.startY, k.targetX, k.targetY] =
          [k.targetX, k.targetY, k.startX, k.startY];
        });

        morphForward = !morphForward;
        morphProgress = 0;
        morphLastTs = null;
        morphAnimate(W, H);
      }, 1800);

      return;
    }

    morphDraw(W, H);
    morphRaf = requestAnimationFrame(step);
  };

  morphRaf = requestAnimationFrame(step);
}

function morphDraw(W, H) {
  const canvas = document.getElementById("morph-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const mobile = W < 700;
  const scale = mobile
    ? Math.max(0.62, Math.min(0.82, W / 520))
    : Math.max(0.82, Math.min(1, W / 520));

  const kw = 22 * scale;
  const kh = 22 * scale;
  const r = 5 * scale;

  morphKeys.forEach(k => {
    const localT = morphEase(
      Math.max(0, Math.min(1, morphProgress - k.group * GROUP_DELAY))
    );

    const x = k.startX + (k.targetX - k.startX) * localT;
    const y = k.startY + (k.targetY - k.startY) * localT;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = GROUP_COLORS[k.group] + "88";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(x, y, kw, kh, r);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = GROUP_COLORS[k.group];
    ctx.font = `bold ${10 * scale}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(k.text, x + kw/2, y + kh/2);
  });
}

window.addEventListener("resize", () => {
  if (currentModalSlide === 1) morphInit();
});

function morphStop() {
  if (morphRaf) {
    cancelAnimationFrame(morphRaf);
    morphRaf = null;
  }
  clearTimeout(morphAutoTimer);
  morphLastTs = null;
}

function skipTutorial() {
  mode = "practice";
  tutorialIndex = TUTORIAL.length;
  practicesDone = 0;
  setFeedback("tutorial skipped", "good");
  newRound();
}

let keyboardVisible = true;

function toggleInputMode() {
  const kbPanel = document.getElementById("kb-panel");
  const inputRow = document.querySelector(".input-row");
  const btn = event.target;

  keyboardVisible = !keyboardVisible;

  if (keyboardVisible) {
    toggleKb();
    inputRow.style.display = "none";
    btn.textContent = "Show input row";
  } else {
    toggleKb();
    inputRow.style.display = "flex";
    btn.textContent = "Hide input row";
    document.getElementById("typed-input").focus();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const isGitHubPages =
    location.hostname.includes("github.io");

  if (isGitHubPages) {
    document.getElementById("dev-buttons").style.display = "none";
    document.querySelector(".input-row").style.display = "none";
  }
});

function openFeedbackIssue() {
  const msg = document.getElementById("feedbackBox").value.trim();

  if (!msg) {
    alert("Please enter feedback first.");
    return;
  }

  const url =
    "https://github.com/BrayBuch/FingerBoard/issues/new?title=Beta Feedback&body=" +
    encodeURIComponent(msg);

  window.open(url, "_blank");
}

let focusMode = false;

function toggleFocusMode() {
  focusMode = !focusMode;

  const body = document.body;
  const btn = document.getElementById("focus-btn");
  const feedback = document.getElementById("feedback");

  body.classList.toggle("focus-mode", focusMode);

  const hideSelectors = [
    ".app-header",
    ".stats",
    ".mode-label",
    ".progress-wrap",
    ".feedback",
    "#dev-buttons",
    ".site-footer"
  ];

  hideSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (el !== btn.parentElement) {
        el.classList.toggle("focus-hidden", focusMode);
      }
    });
  });

  // Explicitly suppress feedback in focus mode
  if (focusMode) {
    feedback.style.display = "none";
    feedback.textContent = "";
  } else {
    feedback.style.display = "";
  }

  btn.textContent = focusMode ? "See more" : "See less";
}

function flashPromptSuccess() {
  const box = document.getElementById("prompt-box");

  box.classList.remove("prompt-success", "prompt-success-glow");

  void box.offsetWidth; // restart animation

  box.classList.add("prompt-success", "prompt-success-glow");

  setTimeout(() => {
    box.classList.remove("prompt-success", "prompt-success-glow");
  }, 500);
}

let tutorialHintShown = true;

function clearTutorialGlow() {
  document.querySelectorAll(".tutorial-glow").forEach(el => {
    el.classList.remove("tutorial-glow");
  });
}

function updateTutorialHint() {
  clearTutorialGlow();

  if (mode !== "tutorial") return;
  if (wordIndex >= currentWords.length) return;

  const expected = currentWords[wordIndex];
  if (!expected) return;

  const expectedSig = getSignature(expected);

  if (kbSuggestions[0] === expected) {
    const enterBtn = document.querySelector(".kb-lock-btn");
    if (enterBtn) enterBtn.classList.add("tutorial-glow");
    return;
  }

  // Slot 2 (next suggestion) is the correct word AND contains current ghost word — highlight next button
  if (kbSuggestions[1] === expected && kbSuggestions[1].startsWith(kbSuggestions[0])) {
    const nextBtn = document.querySelector(".kb-page-btn");
    if (nextBtn) nextBtn.classList.add("tutorial-glow");
    return;
  }

  // If the sig typed so far is already wrong (a pressed finger doesn't match
  // the expected signature at that position), guide the user to backspace.
  for (let i = 0; i < kbSig.length && i < expectedSig.length; i++) {
    if (kbSig[i] !== expectedSig[i]) {
      const bkspBtn = document.querySelector(".kb-bksp-btn");
      if (bkspBtn) bkspBtn.classList.add("tutorial-glow");
      return;
    }
  }

  // Sig is longer than expected — too many presses, backspace needed.
  if (kbSig.length > expectedSig.length) {
    const bkspBtn = document.querySelector(".kb-bksp-btn");
    if (bkspBtn) bkspBtn.classList.add("tutorial-glow");
    return;
  }

  // Sig is a correct prefix but not complete yet — show next finger.
if (kbSig.length < expectedSig.length) {
  const nextChar = expected[kbSig.length]?.toLowerCase();
  const finger = CHAR_TO_KEY[nextChar];

  if (finger !== undefined) {
    const btn = document.getElementById("fb-" + finger);

    if (btn) {
      const halfway = tutorialIndex >= Math.floor(TUTORIAL.length / 2);

      if (halfway) {
        // Highlight only the letter inside the character-button
        const letterEl = Array.from(btn.querySelectorAll(".fl"))
        .find(el => el.textContent.trim().toLowerCase() === nextChar);
        if (letterEl) {
          letterEl.classList.add("tutorial-glow");
        } else {
          btn.classList.add("tutorial-glow");
        }
      } else {
        // First half of tutorial: highlight whole button
        btn.classList.add("tutorial-glow");
      }
    }
  }

  return;
}

  // Sig length matches expected but suggestion isn't right yet.
  // If we're browsing and the expected word is already in the match list,
  // check whether the user has paged past it and point them the right way.
  if (kbBrowseIndex >= 0 && kbExactMatches.length > 0) {
    const expectedIdx = kbExactMatches.indexOf(expected);
    if (expectedIdx !== -1) {
      if (expectedIdx < kbBrowseIndex) {
        // Expected word is behind current position — guide Prev.
        const prevBtn = document.querySelector(".kb-back-btn");
        if (prevBtn) prevBtn.classList.add("tutorial-glow");
      } else {
        // Expected word is ahead — guide Next.
        const nextBtn = document.querySelector(".kb-page-btn");
        if (nextBtn) nextBtn.classList.add("tutorial-glow");
      }
      return;
    }
  }

  // Default: sig matches length, just keep paging forward.
  const nextBtn = document.querySelector(".kb-page-btn");
  if (nextBtn) nextBtn.classList.add("tutorial-glow");
}

let demoTimer = null;
let demoPulseTimeout = null;
let demoStepIndex = 0;

const demoSteps = [
  {press:2, stream:["hat","heat","held","hello","helm"], typed:"h", ghost:"ello", commit:""},
  {press:3, stream:["heavy","hello","helium","helmet"], typed:"he", ghost:"llo", commit:""},
  {press:0, stream:["hello","help","helm"], typed:"hel", ghost:"lo", commit:""},
  {press:0, stream:["hello","helm"], typed:"hell", ghost:"o", commit:""},
  {press:0, stream:["hello"], typed:"hello", ghost:"", commit:""},
  {enter:true, typed:"", ghost:"", commit:"hello "},
  {press:3, stream:["word","work","worm","world"], typed:"w", ghost:"orld", commit:"hello "},
  {press:0, stream:["word","work","world"], typed:"wo", ghost:"rld", commit:"hello "},
  {press:3, stream:["word","world"], typed:"wor", ghost:"ld", commit:"hello "},
  {press:0, stream:["world"], typed:"worl", ghost:"d", commit:"hello "},
  {press:2, stream:["world"], typed:"world", ghost:"", commit:"hello "},
  {enter:true, typed:"", ghost:"", commit:"hello world"}
];

function clearDemoKeys() {
  for (let i = 0; i < 4; i++) {
    document.getElementById("demo-k"+i)?.classList.remove("active");
  }
  document.getElementById("demo-enterBtn")?.classList.remove("active");
}

function pulseDemoElement(el) {
  if (!el) return;
  if (demoPulseTimeout) clearTimeout(demoPulseTimeout);

  el.classList.remove("active");
  void el.offsetWidth;
  el.classList.add("active");

  demoPulseTimeout = setTimeout(() => {
    el.classList.remove("active");
  }, 200);  // ← Increased from 160ms to 200ms for better visibility
}

function renderDemoStep(step) {
  clearDemoKeys();

  if (step.enter) {
    pulseDemoElement(document.getElementById("demo-enterBtn"));
  } else {
    pulseDemoElement(document.getElementById("demo-k"+step.press));
  }

  document.getElementById("demo-stream").textContent =
    step.stream ? step.stream.join("   ") : "";

  document.getElementById("demo-committed").textContent = step.commit || "";
  document.getElementById("demo-ghostTyped").textContent = step.typed || "";
  document.getElementById("demo-ghostPending").textContent = step.ghost || "";
}

function advanceModalDemo() {
  renderDemoStep(demoSteps[demoStepIndex]);
  demoStepIndex++;

  if (demoStepIndex >= demoSteps.length) {
    clearInterval(demoTimer);
    setTimeout(startModalDemo, 1800);
  }
}

function startModalDemo() {
  clearInterval(demoTimer);
  clearDemoKeys();
  demoStepIndex = 0;
  advanceModalDemo();
  demoTimer = setInterval(advanceModalDemo, 900);
}