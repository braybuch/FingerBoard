/* =========================================================
   FINGERBOARD ENGINE
   ========================================================= */

const CHAR_TO_KEY = {
  // Group 3
  q:3, w:3, e:3, r:3, t:3, y:3, u:3,

  // Group 2
  a:2, s:2, d:2, f:2, g:2, h:2, j:2,

  // Group 1
  z:1, x:1, c:1, v:1, b:1, n:1, m:1,

  // Group 0
  i:0, o:0, p:0, k:0, l:0
};

function getSignature(word) {
  let sig = "";
  for (const c of word) {
    const k = CHAR_TO_KEY[c];
    if (k !== undefined) sig += k;
  }
  return sig;
}

let prefixMap    = {};
let signatureMap = {};

const BUILTIN_WORDS = [
  // tutorial sentence words first — guaranteed first predictions
  "welcome","to","fingerboard",
  "press","enter","when","the","word","on","screen","is","correct",
  "next","choose","a","different","matching","full","words","lets","you","type","more",
  "do","not","need","every","letter",
  "but","it","helps","know","where","look",
  "after","few","presses","most","likely","usually","appear",
  "common","become","familiar","very","quickly","with","practice",
  "soon","longer","will","without","looking","at","keyboard",
  "designed","accessible","for","and","efficient","typing",
  "now","begin","practicing","let","your","fingers","learn","patterns",

  // practice sentence words
  "brown","fox","jumps","over","lazy","dog","near","river","bank",
  "day","helps","improve","both","speed","accuracy","time",
  "calm","morning","breeze","carried","leaves","across","empty","parking","lot",
  "she","packed","her","notebook","headphones","charger","before","leaving","home",
  "bright","stars","filled","sky","as","city","lights","faded","in","distance",
  "learning","steady","takes",
  "small","coffee","shop","corner","serves","fresh","bread",
  "they","finished","reading","article","just","meeting","began","online",
  "rain","tapped","softly","against","window","during","quiet","afternoon","class",
  "simple","habits","repeated","daily","often","lead","remarkable","long","term","progress",
  "bicycle","leaned","fence","beside","row","blooming","flowers",
  "several","students","stayed","late","complete","their","science","project","together",
  "clear","instructions","make","complex","tasks","easier","understand",
  "train","arrived","exactly","despite","heavy","snow","last","night",
  "oranges","apples","were","arranged","neatly","wooden","market","baskets",
  "well","test","should","balance","challenge","readability",
  "old","library","clock","chimed","twice","visitors","entered","through","hall",
  "music","played","background","while","programmer","wrote","code",
  "each","round","encourage","focus","rather","than","rushed","mistakes",
  "winter","sunlight","reflected","brightly","off","frozen","lake","behind","school",

  // general high-frequency fill
  "be","that","have","he","but","his","by","we","say","or","an","my",
  "all","would","there","what","so","up","out","if","about","who",
  "go","me","like","no","him","know","take",
  "people","into","year","good","some","could","them","see","other",
  "then","look","come","its","think","also",
  "back","use","two","how","our","work","way","even","want",
  "because","any","these","give","us","great",
  "hand","high","place","hold","turn","here","why","help",
  "put","same","tell","follow","came","show","form","set",
  "never","open","seem","got","walk"
];

function buildMaps(words) {
  prefixMap    = {};
  signatureMap = {};
  for (const word of words) {
    const sig = getSignature(word);
    if (!sig) continue;
    if (!signatureMap[sig]) signatureMap[sig] = [];
    signatureMap[sig].push(word);
    for (let i = 0; i <= sig.length; i++) {
      const pre = sig.slice(0, i);
      if (!prefixMap[pre]) prefixMap[pre] = [];
      prefixMap[pre].push(word);
    }
  }
}

function vocabPeek(prefix, n) {
  return (prefixMap[prefix] || []).slice(0, n);
}

function vocabRead(sig) {
  return signatureMap[sig] || [];
}

buildMaps(BUILTIN_WORDS);

/* Try to load dictionary.txt from same directory (GitHub Pages) */
fetch("dictionary.txt")
  .then(r => r.ok ? r.text() : Promise.reject())
  .then(text => {
    const words = text.split("\n").map(l => l.trim().toLowerCase()).filter(Boolean);
    buildMaps(words);
  })
  .catch(err => {
    console.error("Dictionary load failed:", err);
  });

/* =========================================================
   ENGINE STATE  (ported from FingerboardModel.java)
   ---------------------------------------------------------
   browseIndex semantics (mirrors Java int browseIndex):
     -1  → Predicting  (prefix-peek mode, no exact-match list yet)
     ≥0  → Browsing    (exact-match list captured, index tracks Slot 2)
   ========================================================= */
let kbSig           = "";          // finger-press sequence so far
let kbBrowseIndex   = -1;          // -1 = Predicting, ≥0 = Browsing
let kbSuggestions   = ["", ""];    // [Slot1, Slot2]  shown to user
let kbExactMatches  = [];          // captured once on Handoff, reused while Browsing

/* Called whenever a finger button is pressed.
   Mirrors Java: addInput() — snaps back to Predicting and calls updatePredicting(). */
function kbFinger(index) {
  totalKeystrokes++;
  kbSig += index;

  // Snap back to Predicting (discard any in-progress browse)
  kbBrowseIndex  = -1;
  kbExactMatches = [];

  kbUpdatePredicting();
  kbRenderGhost();
  flashFinger(index);
}

/* Mirrors Java: updatePredicting() — prefix-peek, fills both slots. */
function kbUpdatePredicting() {
  const picks = vocabPeek(kbSig, 2);
  kbSuggestions[0] = picks[0] || "";
  kbSuggestions[1] = picks[1] || "";
}

/* kbNext() — two-state machine mirroring FingerboardModel.nextPage().
   HANDOFF  (kbBrowseIndex === -1): first Next press after finger input.
   BROWSING (kbBrowseIndex  >=  0): subsequent Next presses. */
function kbNext() {
  totalKeystrokes++;
  if (!kbSig) return;

  if (kbBrowseIndex === -1) {
    /* ── HANDOFF: Predicting → Browsing ── */

    // Capture exact-match list once; reused for the whole browse session.
    kbExactMatches = vocabRead(kbSig);

    // Remember what the user already saw so we don't show it again.
    const alreadySeen = new Set(
      [kbSuggestions[0], kbSuggestions[1]].filter(Boolean)
    );

    // Promote old Slot 2 to Slot 1 (what the user was peeking at).
    kbSuggestions[0] = kbSuggestions[1];

    // Find the first exact match the user hasn't seen yet for Slot 2.
    let matchIdx = 0;
    while (
      matchIdx < kbExactMatches.length &&
      alreadySeen.has(kbExactMatches[matchIdx])
    ) {
      matchIdx++;
    }

    kbSuggestions[1] = (matchIdx < kbExactMatches.length)
      ? kbExactMatches[matchIdx]
      : "";
    kbBrowseIndex = matchIdx;

  } else {
    /* ── BROWSING: advance one step ── */

    // Promote Slot 2 → Slot 1.
    kbSuggestions[0] = kbSuggestions[1];

    // Advance and skip any entry that duplicates the new Slot 1.
    kbBrowseIndex++;
    if (
      kbBrowseIndex < kbExactMatches.length &&
      kbExactMatches[kbBrowseIndex] === kbSuggestions[0]
    ) {
      kbBrowseIndex++;
    }

    kbSuggestions[1] = (kbBrowseIndex < kbExactMatches.length)
      ? kbExactMatches[kbBrowseIndex]
      : "";
  }

  kbRenderGhost();
  updateTutorialHint();
}

/* kbPrev() — reverse of kbNext(). Steps one suggestion backwards.
   Only meaningful while Browsing (kbBrowseIndex >= 0).
   If already at the start of the list, does nothing. */
function kbPrev() {
  totalKeystrokes++;
  if (!kbSig) return;

  // Can't go back if we're still in Predicting mode or at the very start.
  if (kbBrowseIndex <= 0) return;

  // Step the index back by one (skip duplicates going backwards).
  kbBrowseIndex--;
  if (
    kbBrowseIndex > 0 &&
    kbExactMatches[kbBrowseIndex] === kbSuggestions[0]
  ) {
    kbBrowseIndex--;
  }

  // Slot 2 becomes what was Slot 1; Slot 1 is the entry before it.
  kbSuggestions[1] = kbSuggestions[0];
  kbSuggestions[0] = (kbBrowseIndex >= 0 && kbExactMatches[kbBrowseIndex])
    ? kbExactMatches[kbBrowseIndex]
    : "";

  kbRenderGhost();
  updateTutorialHint();
}

/* Confirm (Lock) — commit Slot 1 to the text input and submit. */
function kbConfrim() {
  totalKeystrokes++;
  const word = kbSuggestions[0];
  if (!word) return;
  document.getElementById("typed-input").value = word;
  submitAttempt();
}

/* Reset all engine state — called after a word is committed or on kbFinger. */
function kbReset() {
  clearTutorialGlow();
  kbSig          = "";
  kbBrowseIndex  = -1;
  kbSuggestions  = ["", ""];
  kbExactMatches = [];
  kbRenderGhost();
}

/* kbBackspace() — remove the last finger press from kbSig and re-predict.
   Snaps back to Predicting mode, same as pressing a finger button. */
function kbBackspace() {
  if (!kbSig) return;
  totalKeystrokes++;
  kbSig = kbSig.slice(0, -1);

  // Snap back to Predicting
  kbBrowseIndex  = -1;
  kbExactMatches = [];

  kbUpdatePredicting();
  kbRenderGhost();
}

/* Render the ghost word display from current Slot 1 suggestion. */
function kbRenderGhost() {
  const word   = kbSuggestions[0];
  const sigLen = kbSig.length;
  const ph     = document.getElementById("ghost-placeholder");

  if (!word && sigLen === 0) {
    ph.style.display = "";
    document.getElementById("ghost-typed").textContent   = "";
    document.getElementById("ghost-pipe").textContent    = "";
    document.getElementById("ghost-pending").textContent = "";
    return;
  }

  ph.style.display = "none";

  if (!word) {
    document.getElementById("ghost-typed").textContent   = "";
    document.getElementById("ghost-pipe").textContent    = "";
    document.getElementById("ghost-pending").textContent = "[no match]";

    // Auto-reset after brief pause so user isn't stuck
    setTimeout(() => { kbReset(); }, 700);
    return;
  }

  const typedPart   = word.slice(0, Math.min(sigLen, word.length));
  const pendingPart = sigLen < word.length ? word.slice(sigLen) : "";

  document.getElementById("ghost-typed").textContent   = typedPart;
  document.getElementById("ghost-pipe").textContent    = "|";
  document.getElementById("ghost-pending").textContent = pendingPart;

  updateTutorialHint();
}

function flashFinger(index) {
  const btn = document.getElementById("fb-" + index);
  if (!btn) return;
  btn.classList.add("active");
  setTimeout(() => btn.classList.remove("active"), 150);
}

function toggleKb() {
  document.getElementById("kb-panel").classList.toggle("open");
}
