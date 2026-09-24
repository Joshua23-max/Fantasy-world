const chatBox = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const autoSpeakCheckbox = document.getElementById("autoSpeak");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");
const charButtons = document.querySelectorAll(".char-btn");

let currentCharacter = "elara";
let history = [];
let isListening = false;
let recognition = null;

// ========== Character Voice Preferences ==========
const voicePreferences = {
  elara: { gender: "female", pitch: 1.1, rate: 0.95 },   // soft princess
  mage:  { gender: "female", pitch: 1.2, rate: 1.05 },   // playful
  knight:{ gender: "male",   pitch: 0.9, rate: 0.9 },    // serious
  goblin:{ gender: "male",   pitch: 1.4, rate: 1.15 }    // high & fast
};

// ========== Speech Recognition (Voice Input) ==========
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    sendMessage();
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    isListening = false;
    micBtn.classList.remove("listening");
  };
} else {
  micBtn.style.display = "none";
  console.warn("Speech Recognition not supported in this browser");
}

// ========== Text-to-Speech with different voices ==========
function speak(text, character = currentCharacter) {
  if (!autoSpeakCheckbox.checked) return;

  window.speechSynthesis.cancel(); // stop previous speech

  const utterance = new SpeechSynthesisUtterance(text);
  const pref = voicePreferences[character] || voicePreferences.elara;

  // Try to pick a good voice
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (pref.gender === "female") {
    selectedVoice = voices.find(v => 
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("karen") ||
      v.name.toLowerCase().includes("zira") ||
      v.name.toLowerCase().includes("google uk english female")
    );
  } else {
    selectedVoice = voices.find(v => 
      v.name.toLowerCase().includes("male") ||
      v.name.toLowerCase().includes("daniel") ||
      v.name.toLowerCase().includes("david") ||
      v.name.toLowerCase().includes("google uk english male")
    );
  }

  if (selectedVoice) utterance.voice = selectedVoice;

  utterance.pitch = pref.pitch;
  utterance.rate = pref.rate;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

// Load voices (needed on some browsers)
window.speechSynthesis.onvoiceschanged = () => {
  window.speechSynthesis.getVoices();
};

// ========== UI Helpers ==========
function addMessage(text, role, speakerName = null) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  if (role === "bot" && speakerName) {
    const speaker = document.createElement("div");
    speaker.className = "speaker";
    speaker.textContent = speakerName;
    div.appendChild(speaker);
  }

  const content = document.createElement("div");
  content.textContent = text;
  div.appendChild(content);

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ========== Send Message ==========
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage(message, "user");
  history.push({ role: "user", content: message });
  messageInput.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        character: currentCharacter,
        history
      })
    });

    const data = await res.json();

    if (data.error) {
      addMessage(data.error, "bot");
      return;
    }

    addMessage(data.reply, "bot", data.character);
    history.push({ role: "assistant", content: data.reply });

    // Speak the reply with the correct character voice
    speak(data.reply, currentCharacter);

  } catch (err) {
    console.error(err);
    addMessage("The magic connection failed... try again.", "bot");
  }
}

// ========== Event Listeners ==========
sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

micBtn.addEventListener("click", () => {
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
    isListening = false;
    micBtn.classList.remove("listening");
  } else {
    recognition.start();
    isListening = true;
    micBtn.classList.add("listening");
  }
});

stopSpeakBtn.addEventListener("click", () => {
  window.speechSynthesis.cancel();
});

// Character switching
charButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    charButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCharacter = btn.dataset.char;
  });
});

// Welcome message
window.addEventListener("load", () => {
  setTimeout(() => {
    const welcome = "You awaken in a dark forest, heart pounding. Goblin shouts echo nearby... Suddenly a clear voice calls out: \"Hold on!\" Princess Elara appears with her knights and drives the goblins away. She looks at you with curious eyes. \"You... you're not from this world, are you?\"";
    addMessage(welcome, "bot", "Narrator");
    speak(welcome, "elara");
  }, 600);
});
