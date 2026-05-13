const SpeechApp = {
  recognizer: null,
  synthesizer: null,
  audioPlayer: null,
  lastAudioUrl: null,
  sdkReady: false,
  sdkLoading: false,
  toastTimer: null,
};

const SPEECH_SDK_SOURCES = [
  "https://aka.ms/csspeech/jsbrowserpackageraw",
  "https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js",
  "https://unpkg.com/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js",
];

const elements = {
  root: document.documentElement,
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.getElementById("themeIcon"),
  speechKey: document.getElementById("speechKey"),
  speechEndpoint: document.getElementById("speechEndpoint"),
  speechRegion: document.getElementById("speechRegion"),
  toggleKey: document.getElementById("toggleKey"),
  language: document.getElementById("language"),
  targetLanguage: document.getElementById("targetLanguage"),
  voiceName: document.getElementById("voiceName"),
  speechRate: document.getElementById("speechRate"),
  speechPitch: document.getElementById("speechPitch"),
  statusDot: document.getElementById("statusDot"),
  statusTitle: document.getElementById("statusTitle"),
  statusMessage: document.getElementById("statusMessage"),
  tabs: document.querySelectorAll(".tab"),
  toolViews: document.querySelectorAll(".tool-view"),
  recognizeOnce: document.getElementById("recognizeOnce"),
  startContinuous: document.getElementById("startContinuous"),
  stopContinuous: document.getElementById("stopContinuous"),
  transcriptOutput: document.getElementById("transcriptOutput"),
  copyTranscript: document.getElementById("copyTranscript"),
  downloadTranscript: document.getElementById("downloadTranscript"),
  clearTranscript: document.getElementById("clearTranscript"),
  transcriptStats: document.getElementById("transcriptStats"),
  synthesisText: document.getElementById("synthesisText"),
  speakText: document.getElementById("speakText"),
  stopSpeaking: document.getElementById("stopSpeaking"),
  downloadAudio: document.getElementById("downloadAudio"),
  audioPreview: document.getElementById("audioPreview"),
  translateOnce: document.getElementById("translateOnce"),
  sourceOutput: document.getElementById("sourceOutput"),
  translationOutput: document.getElementById("translationOutput"),
  toast: document.getElementById("toast"),
};

function showToast(message) {
  window.clearTimeout(SpeechApp.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  SpeechApp.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3200);
}

function setStatus(type, title, message) {
  elements.statusDot.className = `status-dot ${type || ""}`.trim();
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function setSpeechActionsEnabled(enabled) {
  [
    elements.recognizeOnce,
    elements.startContinuous,
    elements.speakText,
    elements.translateOnce,
  ].forEach((button) => {
    button.disabled = !enabled;
  });

  if (!enabled) {
    elements.stopContinuous.disabled = true;
  }
}

function markSdkReady(source) {
  SpeechApp.sdkReady = true;
  SpeechApp.sdkLoading = false;
  setSpeechActionsEnabled(true);

  const ready = elements.speechKey.value.trim() && elements.speechEndpoint.value.trim();
  setStatus(
    ready ? "ok" : "",
    ready ? "Speech SDK ready" : "Ready to connect",
    ready ? "Choose a task and run the Speech Service." : "Enter your Speech key and endpoint to begin."
  );

  console.info(`Speech SDK loaded from ${source}`);
}

function loadScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = true;

    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error(`Timed out loading ${source}`));
    }, 9000);

    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.SpeechSDK) {
        resolve(source);
        return;
      }
      script.remove();
      reject(new Error(`Loaded ${source}, but SpeechSDK was not available.`));
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error(`Failed to load ${source}`));
    };

    document.head.appendChild(script);
  });
}

async function loadSpeechSdk() {
  if (window.SpeechSDK) {
    markSdkReady("existing page script");
    return;
  }

  if (SpeechApp.sdkLoading) return;

  SpeechApp.sdkLoading = true;
  setSpeechActionsEnabled(false);
  setStatus("", "Loading Speech SDK", "Preparing the browser speech tools. This can take a few seconds.");

  for (const source of SPEECH_SDK_SOURCES) {
    try {
      const loadedSource = await loadScript(source);
      markSdkReady(loadedSource);
      return;
    } catch (error) {
      console.warn(error.message);
    }
  }

  SpeechApp.sdkLoading = false;
  setSpeechActionsEnabled(false);
  setStatus(
    "error",
    "Speech SDK could not load",
    "Your browser or network blocked Microsoft, jsDelivr, and unpkg SDK scripts. Try another browser, disable script blockers, or use another network."
  );
}

function ensureSdk() {
  if (!window.SpeechSDK) {
    loadSpeechSdk();
    throw new Error("Speech SDK is still loading. Wait a few seconds, then try again.");
  }
}

function getCredentials() {
  const key = elements.speechKey.value.trim();
  const endpoint = normalizeEndpoint(elements.speechEndpoint.value);
  const region = normalizeRegion(elements.speechRegion.value);

  if (!key || !endpoint) {
    throw new Error("Enter both your Speech key and endpoint first.");
  }

  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error("Endpoint must be a valid URL.");
  }

  return {
    key,
    endpointUrl,
    region: region || inferRegionFromEndpoint(endpointUrl),
    regionOverride: Boolean(region),
  };
}

function normalizeEndpoint(value) {
  const endpoint = value.trim();
  if (!endpoint) return "";

  if (/^https?:\/\//i.test(endpoint) || /^wss?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return `https://${endpoint}`;
}

function normalizeRegion(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function inferRegionFromEndpoint(endpointUrl) {
  const hostParts = endpointUrl.hostname.toLowerCase().split(".");
  const firstPart = hostParts[0];

  if (
    hostParts.length >= 4 &&
    hostParts[1] === "api" &&
    hostParts[2] === "cognitive" &&
    hostParts[3] === "microsoft"
  ) {
    return firstPart;
  }

  if (
    hostParts.length >= 4 &&
    (hostParts[1] === "stt" || hostParts[1] === "tts") &&
    hostParts[2] === "speech" &&
    hostParts[3] === "microsoft"
  ) {
    return firstPart;
  }

  return "";
}

function createConfigFromCredentials(configFactory) {
  ensureSdk();
  const { key, endpointUrl, region, regionOverride } = getCredentials();

  if (region) {
    const config = configFactory.fromSubscription(key, region);
    setStatus(
      "ok",
      "Credentials loaded",
      regionOverride
        ? `Using key with the ${region} region you entered.`
        : `Using key with the inferred ${region} region.`
    );
    return config;
  }

  const config = configFactory.fromEndpoint(endpointUrl, key);
  setStatus("ok", "Credentials loaded", "Using the endpoint from your Speech resource.");
  return config;
}

function createSpeechConfig() {
  const speechConfig = createConfigFromCredentials(SpeechSDK.SpeechConfig);

  speechConfig.speechRecognitionLanguage = elements.language.value;
  speechConfig.speechSynthesisLanguage = elements.language.value;
  speechConfig.speechSynthesisVoiceName = elements.voiceName.value;
  speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;

  return speechConfig;
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function buildSsml(text) {
  const voice = elements.voiceName.value;
  const locale = voice.split("-").slice(0, 2).join("-");
  const rate = elements.speechRate.value;
  const pitch = elements.speechPitch.value;

  return [
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">`,
    `<voice name="${voice}">`,
    `<prosody rate="${rate}" pitch="${pitch}">`,
    escapeXml(text),
    "</prosody>",
    "</voice>",
    "</speak>",
  ].join("");
}

function createTranslationConfig() {
  const translationConfig = createConfigFromCredentials(SpeechSDK.SpeechTranslationConfig);

  translationConfig.speechRecognitionLanguage = elements.language.value;
  translationConfig.addTargetLanguage(elements.targetLanguage.value);
  setStatus("ok", "Translation ready", "Speak a phrase and the translated text will appear here.");
  return translationConfig;
}

function closeRecognizer() {
  if (SpeechApp.recognizer) {
    SpeechApp.recognizer.close();
    SpeechApp.recognizer = null;
  }
}

function closeSynthesizer() {
  if (SpeechApp.synthesizer) {
    SpeechApp.synthesizer.close();
    SpeechApp.synthesizer = null;
  }
}

function setGeneratedAudio(audioData) {
  if (SpeechApp.lastAudioUrl) {
    URL.revokeObjectURL(SpeechApp.lastAudioUrl);
  }

  const blob = new Blob([audioData], { type: "audio/wav" });
  SpeechApp.lastAudioUrl = URL.createObjectURL(blob);
  elements.audioPreview.src = SpeechApp.lastAudioUrl;
  elements.downloadAudio.disabled = false;
}

function appendTranscript(text) {
  if (!text) return;
  const spacer = elements.transcriptOutput.value.trim() ? "\n" : "";
  elements.transcriptOutput.value += `${spacer}${text}`;
  updateTranscriptStats();
}

function updateTranscriptStats() {
  const count = elements.transcriptOutput.value.length;
  elements.transcriptStats.textContent = `${count} character${count === 1 ? "" : "s"}`;
}

function handleResultReason(result, successMessage) {
  const reason = SpeechSDK.ResultReason;

  if (result.reason === reason.Canceled) {
    const details = SpeechSDK.CancellationDetails.fromResult(result);
    const errorCode = details.errorCode ? ` (${details.errorCode})` : "";
    throw new Error(`${details.errorDetails || "The Speech Service canceled the request."}${errorCode}`);
  }

  if (result.reason === reason.NoMatch) {
    showToast("No speech could be recognized. Try again closer to the microphone.");
    return false;
  }

  showToast(successMessage);
  return true;
}

async function recognizeOnce() {
  try {
    closeRecognizer();
    const speechConfig = createSpeechConfig();
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    SpeechApp.recognizer = recognizer;

    setStatus("", "Listening once", "Allow microphone access, then speak a short phrase.");
    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          if (handleResultReason(result, "Speech recognized.")) {
            appendTranscript(result.text);
            setStatus("ok", "Speech recognized", "The transcript has been updated.");
          }
        } catch (error) {
          reportError(error);
        } finally {
          closeRecognizer();
        }
      },
      (error) => {
        reportError(error);
        closeRecognizer();
      }
    );
  } catch (error) {
    reportError(error);
  }
}

function startContinuousRecognition() {
  try {
    closeRecognizer();
    const speechConfig = createSpeechConfig();
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    SpeechApp.recognizer = recognizer;

    elements.startContinuous.disabled = true;
    elements.stopContinuous.disabled = false;
    setStatus("", "Live captions running", "Speak naturally. Final phrases are added to the transcript.");

    recognizer.recognizing = (_, event) => {
      elements.statusMessage.textContent = event.result.text || "Listening for speech...";
    };

    recognizer.recognized = (_, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        appendTranscript(event.result.text);
      }
    };

    recognizer.canceled = (_, event) => {
      stopContinuousRecognition();
      reportError(event.errorDetails || "Continuous recognition was canceled.");
    };

    recognizer.sessionStopped = () => {
      stopContinuousRecognition();
    };

    recognizer.startContinuousRecognitionAsync(
      () => showToast("Live captions started."),
      (error) => {
        reportError(error);
        stopContinuousRecognition();
      }
    );
  } catch (error) {
    reportError(error);
    stopContinuousRecognition();
  }
}

function stopContinuousRecognition() {
  elements.startContinuous.disabled = false;
  elements.stopContinuous.disabled = true;

  if (!SpeechApp.recognizer) {
    setStatus("ok", "Ready", "Live captions are stopped.");
    return;
  }

  const recognizer = SpeechApp.recognizer;
  recognizer.stopContinuousRecognitionAsync(
    () => {
      closeRecognizer();
      setStatus("ok", "Ready", "Live captions are stopped.");
      showToast("Live captions stopped.");
    },
    (error) => {
      reportError(error);
      closeRecognizer();
    }
  );
}

function speakText() {
  try {
    closeSynthesizer();
    const text = elements.synthesisText.value.trim();
    if (!text) {
      throw new Error("Enter some text to speak.");
    }

    const speechConfig = createSpeechConfig();
    SpeechApp.audioPlayer = new SpeechSDK.SpeakerAudioDestination();
    const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(SpeechApp.audioPlayer);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
    SpeechApp.synthesizer = synthesizer;

    setStatus("", "Speaking", "The selected neural voice is reading your text.");
    synthesizer.speakSsmlAsync(
      buildSsml(text),
      (result) => {
        try {
          if (handleResultReason(result, "Speech synthesis complete.")) {
            setGeneratedAudio(result.audioData);
            setStatus("ok", "Speech complete", "You can edit the text or choose another voice.");
          }
        } catch (error) {
          reportError(error);
        } finally {
          closeSynthesizer();
        }
      },
      (error) => {
        reportError(error);
        closeSynthesizer();
      }
    );
  } catch (error) {
    reportError(error);
  }
}

function stopSpeaking() {
  if (SpeechApp.audioPlayer) {
    SpeechApp.audioPlayer.pause();
  }
  closeSynthesizer();
  setStatus("ok", "Audio stopped", "Text to speech playback has been stopped.");
}

function translateOnce() {
  try {
    closeRecognizer();
    const translationConfig = createTranslationConfig();
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.TranslationRecognizer(translationConfig, audioConfig);
    const target = elements.targetLanguage.value;
    SpeechApp.recognizer = recognizer;

    setStatus("", "Listening for translation", "Speak one phrase for translation.");
    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          if (handleResultReason(result, "Speech translated.")) {
            elements.sourceOutput.value = result.text || "";
            elements.translationOutput.value = result.translations.get(target) || "";
            setStatus("ok", "Translation complete", "Original and translated text are ready.");
          }
        } catch (error) {
          reportError(error);
        } finally {
          closeRecognizer();
        }
      },
      (error) => {
        reportError(error);
        closeRecognizer();
      }
    );
  } catch (error) {
    reportError(error);
  }
}

async function copyTranscript() {
  const text = elements.transcriptOutput.value.trim();
  if (!text) {
    showToast("There is no transcript to copy yet.");
    return;
  }

  await navigator.clipboard.writeText(text);
  showToast("Transcript copied.");
}

function downloadTranscript() {
  const text = elements.transcriptOutput.value.trim();
  if (!text) {
    showToast("There is no transcript to download yet.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `speech-transcript-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function clearTranscript() {
  elements.transcriptOutput.value = "";
  updateTranscriptStats();
  showToast("Transcript cleared.");
}

function downloadAudio() {
  if (!SpeechApp.lastAudioUrl) {
    showToast("Generate speech before downloading audio.");
    return;
  }

  const link = document.createElement("a");
  link.href = SpeechApp.lastAudioUrl;
  link.download = `speech-audio-${Date.now()}.wav`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function reportError(error) {
  const message = typeof error === "string" ? error : error.message;
  console.error(error);
  setStatus("error", "Something needs attention", message || "An unknown error occurred.");
  showToast(message || "An unknown error occurred.");
}

function bindTabs() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elements.tabs.forEach((item) => {
        item.classList.toggle("active", item === tab);
        item.setAttribute("aria-selected", item === tab ? "true" : "false");
      });

      elements.toolViews.forEach((view) => {
        const active = view.id === tab.dataset.tab;
        view.classList.toggle("active", active);
        view.hidden = !active;
      });
    });
  });
}

function bindTheme() {
  const savedTheme = localStorage.getItem("speech-theme") || "dark";
  const isLight = savedTheme === "light";
  elements.root.classList.toggle("light", isLight);
  elements.themeToggle.setAttribute("aria-pressed", String(isLight));
  elements.themeIcon.textContent = isLight ? "Light" : "Dark";

  elements.themeToggle.addEventListener("click", () => {
    const nextIsLight = !elements.root.classList.contains("light");
    elements.root.classList.toggle("light", nextIsLight);
    elements.themeToggle.setAttribute("aria-pressed", String(nextIsLight));
    elements.themeIcon.textContent = nextIsLight ? "Light" : "Dark";
    localStorage.setItem("speech-theme", nextIsLight ? "light" : "dark");
  });
}

function bindEvents() {
  elements.toggleKey.addEventListener("click", () => {
    const showing = elements.speechKey.type === "text";
    elements.speechKey.type = showing ? "password" : "text";
    elements.toggleKey.textContent = showing ? "Show" : "Hide";
  });

  elements.recognizeOnce.addEventListener("click", recognizeOnce);
  elements.startContinuous.addEventListener("click", startContinuousRecognition);
  elements.stopContinuous.addEventListener("click", stopContinuousRecognition);
  elements.speakText.addEventListener("click", speakText);
  elements.stopSpeaking.addEventListener("click", stopSpeaking);
  elements.translateOnce.addEventListener("click", translateOnce);
  elements.copyTranscript.addEventListener("click", copyTranscript);
  elements.downloadTranscript.addEventListener("click", downloadTranscript);
  elements.clearTranscript.addEventListener("click", clearTranscript);
  elements.downloadAudio.addEventListener("click", downloadAudio);
  elements.transcriptOutput.addEventListener("input", updateTranscriptStats);

  [elements.speechKey, elements.speechEndpoint, elements.speechRegion].forEach((field) => {
    field.addEventListener("input", () => {
      const ready = elements.speechKey.value.trim() && elements.speechEndpoint.value.trim();
      if (ready) {
        setStatus("ok", "Credentials entered", "Choose a task and run the Speech Service.");
      } else {
        setStatus("", "Ready to connect", "Credentials stay in your browser and are only used for Speech SDK calls.");
      }
    });
  });
}

bindTheme();
bindTabs();
bindEvents();
updateTranscriptStats();
loadSpeechSdk();
