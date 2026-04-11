/* =========================================================
   TRAINER LOGIC
   ========================================================= */

const TUTORIAL = [
  "welcome to fingerboard",
  "press enter when the word is correct",
  "press next if it is not correct",
  "you do not need to type every letter",
  "but it helps to know where to look",
  "press next to get variations of words",
  "fingerboard is designed for accessible and efficient typing",
  "now begin practicing and let your fingers learn"
];

const PRACTICE = [
  "the quick brown fox jumps over the lazy dog near the river bank",
  "typing every day helps improve both speed and accuracy over time",
  "a calm morning breeze carried leaves across the empty parking lot",
  "she packed her notebook headphones and charger before leaving home",
  "bright stars filled the sky as the city lights faded in the distance",
  "learning to type without looking at the keyboard takes steady practice",
  "the small coffee shop on the corner serves fresh bread every morning",
  "they finished reading the article just before the meeting began online",
  "rain tapped softly against the window during the quiet afternoon class",
  "simple habits repeated daily often lead to remarkable long term progress",
  "the bicycle leaned against the fence beside a row of blooming flowers",
  "several students stayed late to complete their science project together",
  "clear instructions make complex tasks easier to understand and complete",
  "the train arrived exactly on time despite the heavy snow last night",
  "fresh oranges and apples were arranged neatly in wooden market baskets",
  "a well designed typing test should balance challenge with readability",
  "the old library clock chimed twice as visitors entered through the hall",
  "music played softly in the background while the programmer wrote code",
  "each practice round should encourage focus rather than rushed mistakes",
  "winter sunlight reflected brightly off the frozen lake behind the school"
];

let mode            = "tutorial";  // "tutorial" | "practice"
let tutorialIndex   = 0;
let practicesDone   = 0;

let currentWords    = [];
let wordIndex       = 0;
let startTime       = null;
let totalAttempts   = 0;
let correctAttempts = 0;
let streak          = 0;

let totalKeystrokes = 0;
let totalCharacters = 0;

let practiceDeck = [];
let deckIndex    = 0;

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPracticeSentence() {
  if (deckIndex >= practiceDeck.length) {
    practiceDeck = shuffleArray(PRACTICE);
    deckIndex    = 0;
  }
  console.log("All sentences ");
  for (let i = 0; i < practiceDeck.length; i++) {
    console.log(`  ${i}: ${practiceDeck[i]}`);
  }
  return practiceDeck[deckIndex++];
}

function updateProgress() {
  const fill  = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  const modeEl = document.getElementById("mode-label");

  if (mode === "tutorial") {
    const pct = Math.round((tutorialIndex / TUTORIAL.length) * 100);
    fill.style.width = pct + "%";
    label.textContent = tutorialIndex + " / " + TUTORIAL.length;
    modeEl.textContent = "tutorial";
  } else {
    const pct = Math.min(100, Math.round((practicesDone / 20) * 100));
    fill.style.width = pct + "%";
    label.textContent = practicesDone + " completed";
    modeEl.textContent = "free practice";
  }
}

function newRound() {
  let sentence;
  if (mode === "tutorial") {
    if (tutorialIndex >= TUTORIAL.length) {
      mode = "practice";
      setFeedback("tutorial complete keep going!", "good");
    }
  }

  if (mode === "tutorial") {
    sentence = TUTORIAL[tutorialIndex];
  } else {
    sentence = nextPracticeSentence();
  }

  currentWords = sentence.split(" ");
  wordIndex    = 0;
  startTime    = null;
  renderPrompt();
  updateProgress();
  document.getElementById("typed-input").value = "";
  document.getElementById("typed-input").focus();
  if (mode === "practice") {
    document.getElementById("feedback").textContent = "";
    document.getElementById("feedback").className = "feedback";
  }

  updateTutorialHint();
}

function renderPrompt() {
  const box = document.getElementById("prompt-box");
  box.innerHTML = currentWords.map((w, i) => {
    let cls = "word-pending";
    if (i < wordIndex)   cls = "word-correct";
    if (i === wordIndex) cls = "word-current";
    return `<span class="word ${cls}">${w}</span>`;
  }).join(" ");
}

function submitAttempt() {
  const input = document.getElementById("typed-input");
  const typed = input.value.trim();
  if (!typed) return;

  if (startTime === null) startTime = Date.now();

  const expected = currentWords[wordIndex];
  totalAttempts++;

  if (typed === expected) {
    if (!tutorialHintShown && mode === "tutorial" && tutorialIndex === 0 && wordIndex === 0) {
      tutorialHintShown = true;
      clearTutorialGlow();
    }
    totalCharacters += typed.length;
    correctAttempts++;
    streak++;
    wordIndex++;

    kbReset();
    renderPrompt();
    updateTutorialHint();

    if (wordIndex >= currentWords.length) {
      flashPromptSuccess();
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      const wpm = Math.round(currentWords.length / elapsed);
      const acc = Math.round((correctAttempts / totalAttempts) * 100);
      const kpc = totalCharacters > 0 ? (totalKeystrokes / totalCharacters).toFixed(2) : " ";
      document.getElementById("wpm-display").textContent = wpm;
      document.getElementById("acc-display").textContent = acc + "%";
      document.getElementById("kpc-display").textContent = kpc;
      document.getElementById("streak-display").textContent = streak;

      if (mode === "tutorial") {
        tutorialIndex++;
        if (tutorialIndex >= TUTORIAL.length) {
          setFeedback("tutorial complete!", "good");
          const elapsed = (Date.now() - startTime) / 1000 / 60;
          const finalWpm = Math.round(currentWords.length / elapsed);
          const finalKpc = totalCharacters > 0 ? (totalKeystrokes / totalCharacters).toFixed(2) : "-";
          setTimeout(() => showTutorialCompleteModal(finalWpm, finalKpc, streak), 750);
        } else {
          setFeedback("nice!", "good");
        }
      } else {
        practicesDone++;
        if (practicesDone === 10) {
          const finalKpc = totalCharacters > 0 ? (totalKeystrokes / totalCharacters).toFixed(2) : "-";
          setTimeout(() => showPracticeCompleteModal(wpm, finalKpc, streak), 750);
        } else {
          setFeedback("nice work!", "good");
        }
      }
      setTimeout(newRound, 700);
    } else {
      setFeedback("", "");
      renderPrompt();
    }
  } else {
    streak = 0;
    document.getElementById("streak-display").textContent = streak;
    const box   = document.getElementById("prompt-box");
    const spans = box.querySelectorAll(".word");
    spans[wordIndex].className = "word word-wrong";
    setFeedback(`expected: "${expected}"`, "bad");
    setTimeout(() => {
      spans[wordIndex].className = "word word-current";
      setFeedback("", "");
    }, 1000);
  }

  input.value = "";
}

function setFeedback(msg, type) {
  const el = document.getElementById("feedback");
  el.textContent = msg;
  el.className = "feedback" + (type ? " " + type : "");
}

document.getElementById("typed-input").addEventListener("keydown", e => {
  if (e.key === "Enter") submitAttempt();
  if (e.key === " ") { e.preventDefault(); submitAttempt(); }
});