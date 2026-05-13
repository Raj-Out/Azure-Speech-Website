const SpeechApp = {
  recognizer: null,
  synthesizer: null,
  audioPlayer: null,
  continuousRestActive: false,
  lastAudioUrl: null,
  sdkReady: false,
  sdkLoading: false,
  toastTimer: null,
};

const SPEECH_SDK_SOURCES = [
  "https://cdn.jsdelivr.net/npm/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js",
  "https://unpkg.com/microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js",
  "https://aka.ms/csspeech/jsbrowserpackageraw",
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
  synthesisStatus: document.getElementById("synthesisStatus"),
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

function setSynthesisStatus(message, type = "") {
  elements.synthesisStatus.textContent = message;
  elements.synthesisStatus.className = `field-hint inline-status ${type}`.trim();
}

function setSpeechActionsEnabled(enabled) {
  [
    elements.recognizeOnce,
    elements.startContinuous,
    elements.speakText,
    elements.translateOnce,
  ].forEach((button) => {
    button.disabled = false;
    button.setAttribute("aria-disabled", String(!enabled));
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
    return true;
  }

  if (SpeechApp.sdkLoading) return false;

  SpeechApp.sdkLoading = true;
  setSpeechActionsEnabled(true);
  setStatus("", "Loading Speech SDK", "Preparing the browser speech tools. This can take a few seconds.");

  for (const source of SPEECH_SDK_SOURCES) {
    try {
      const loadedSource = await loadScript(source);
      markSdkReady(loadedSource);
      return true;
    } catch (error) {
      console.warn(error.message);
    }
  }

  SpeechApp.sdkLoading = false;
  setSpeechActionsEnabled(true);
  setStatus(
    "error",
    "Speech SDK could not load",
    "Your browser or network blocked Microsoft, jsDelivr, and unpkg SDK scripts. Try another browser, disable script blockers, or use another network."
  );
  return false;
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

function getSpeechServiceRegion() {
  const { region } = getCredentials();

  if (!region) {
    throw new Error("Enter the Speech resource region, for example eastasia, in the Region override field.");
  }

  return region;
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

function setSpeakingBusy(isBusy) {
  elements.speakText.disabled = isBusy;
  elements.speakText.textContent = isBusy ? "Preparing audio..." : "Speak text";
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
    elements.recognizeOnce.disabled = true;
    setStatus("", "Listening once", "Allow microphone access, then speak for about 6 seconds.");

    const text = await recognizeSpeechWithRest(6000);
    if (!text) {
      setStatus("error", "No speech recognized", "Try again closer to the microphone.");
      showToast("No speech could be recognized.");
      return;
    }

    appendTranscript(text);
    setStatus("ok", "Speech recognized", "The transcript has been updated.");
    showToast("Speech recognized.");
  } catch (error) {
    reportError(error);
  } finally {
    elements.recognizeOnce.disabled = false;
  }
}

async function startContinuousRecognition() {
  try {
    closeRecognizer();
    SpeechApp.continuousRestActive = true;
    elements.startContinuous.disabled = true;
    elements.stopContinuous.disabled = false;
    setStatus("", "Live captions running", "Recording short speech chunks and sending them to Azure.");
    showToast("Live captions started.");

    while (SpeechApp.continuousRestActive) {
      elements.statusMessage.textContent = "Listening for speech...";
      try {
        const text = await recognizeSpeechWithRest(4500);
        if (text) {
          appendTranscript(text);
          elements.statusMessage.textContent = text;
        }
      } catch (error) {
        if (SpeechApp.continuousRestActive) {
          throw error;
        }
      }
    }
  } catch (error) {
    reportError(error);
  } finally {
    SpeechApp.continuousRestActive = false;
    elements.startContinuous.disabled = false;
    elements.stopContinuous.disabled = true;
  }
}

function stopContinuousRecognition() {
  SpeechApp.continuousRestActive = false;
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

async function speakText() {
  try {
    closeSynthesizer();
    const text = elements.synthesisText.value.trim();
    if (!text) {
      throw new Error("Enter some text to speak.");
    }

    setSpeakingBusy(true);
    setSynthesisStatus("Preparing speech audio. Keep this tab open.", "");
    setStatus("", "Creating speech", "Sending your text to Azure Speech REST.");

    const audioData = await synthesizeSpeechWithRest(text);
    setGeneratedAudio(audioData);
    elements.audioPreview.play().catch(() => {
      showToast("Audio is ready. Press play in the Generated audio control.");
    });
    setSynthesisStatus("Audio is ready. You can replay or download it.", "ok");
    setStatus("ok", "Speech complete", "You can edit the text or choose another voice.");
    showToast("Speech synthesis complete.");
  } catch (error) {
    reportError(error, { synthesis: true });
  } finally {
    setSpeakingBusy(false);
  }
}

function getAudioContextConstructor() {
  return window.AudioContext || window.webkitAudioContext;
}

function flattenFloat32Chunks(chunks, sampleCount) {
  const samples = new Float32Array(sampleCount);
  let offset = 0;

  chunks.forEach((chunk) => {
    samples.set(chunk, offset);
    offset += chunk.length;
  });

  return samples;
}

function resampleTo16Khz(samples, sourceSampleRate) {
  const targetSampleRate = 16000;
  if (sourceSampleRate === targetSampleRate) return samples;

  const ratio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.round(samples.length / ratio);
  const result = new Float32Array(targetLength);

  for (let index = 0; index < targetLength; index += 1) {
    const sourceIndex = index * ratio;
    const lower = Math.floor(sourceIndex);
    const upper = Math.min(Math.ceil(sourceIndex), samples.length - 1);
    const weight = sourceIndex - lower;
    result[index] = samples[lower] * (1 - weight) + samples[upper] * weight;
  }

  return result;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const sampleRate = 16000;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  samples.forEach((sample) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  });

  return new Blob([view], { type: "audio/wav" });
}

async function recordMicrophoneAsWav(durationMs) {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    throw new Error("This browser does not support microphone audio recording.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContextConstructor();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  let sampleCount = 0;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
    sampleCount += input.length;
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  await new Promise((resolve) => window.setTimeout(resolve, durationMs));

  const sourceSampleRate = audioContext.sampleRate;
  processor.disconnect();
  source.disconnect();
  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();

  const samples = flattenFloat32Chunks(chunks, sampleCount);
  return encodeWav(resampleTo16Khz(samples, sourceSampleRate));
}

async function recognizeSpeechWithRest(durationMs = 6000) {
  const { key } = getCredentials();
  const region = getSpeechServiceRegion();
  const language = encodeURIComponent(elements.language.value);
  const wavAudio = await recordMicrophoneAsWav(durationMs);
  let response;

  try {
    response = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}&format=detailed`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "audio/wav",
          Accept: "application/json",
        },
        body: wavAudio,
      }
    );
  } catch {
    throw new Error("Could not reach Azure Speech recognition. Check microphone permission, endpoint region, browser network access, and key.");
  }

  const payloadText = await response.text();
  let payload = {};
  try {
    payload = payloadText ? JSON.parse(payloadText) : {};
  } catch {
    payload = { error: payloadText };
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error || `Speech recognition failed with HTTP ${response.status}.`);
  }

  if (payload.RecognitionStatus && payload.RecognitionStatus !== "Success") {
    throw new Error(`Speech recognition returned ${payload.RecognitionStatus}. Try speaking clearly near the microphone.`);
  }

  return payload.DisplayText || payload.NBest?.[0]?.Display || "";
}

async function synthesizeSpeechWithRest(text) {
  const { key } = getCredentials();
  const region = getSpeechServiceRegion();
  let response;

  try {
    response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
        Accept: "audio/wav",
      },
      body: buildSsml(text),
    });
  } catch {
    throw new Error("Could not reach Azure Speech. Check the endpoint region, browser network access, and key.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Speech synthesis failed with HTTP ${response.status}. Check your key and region.`);
  }

  return response.arrayBuffer();
}

function stopSpeaking() {
  if (SpeechApp.audioPlayer) {
    SpeechApp.audioPlayer.pause();
  }
  elements.audioPreview.pause();
  closeSynthesizer();
  setStatus("ok", "Audio stopped", "Text to speech playback has been stopped.");
}

async function translateOnce() {
  try {
    closeRecognizer();
    elements.translateOnce.disabled = true;
    setStatus("", "Listening for translation", "First converting speech to text with Azure Speech REST.");

    const text = await recognizeSpeechWithRest(6000);
    elements.sourceOutput.value = text || "";
    elements.translationOutput.value = text
      ? "Speech-to-text is working. Translation requires an Azure Translator or multi-service key, so this Speech-only page cannot translate with only a Speech resource key."
      : "";

    setStatus(
      text ? "ok" : "error",
      text ? "Speech captured" : "No speech recognized",
      text
        ? "Speech was captured. Add Azure Translator support to translate the text."
        : "Try again closer to the microphone."
    );
  } catch (error) {
    reportError(error);
  } finally {
    elements.translateOnce.disabled = false;
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

function reportError(error, options = {}) {
  const message = typeof error === "string" ? error : error.message;
  console.error(error);
  setStatus("error", "Something needs attention", message || "An unknown error occurred.");
  if (options.synthesis) {
    setSynthesisStatus(message || "Speech synthesis failed. Check your key, endpoint, and region.", "error");
  }
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
        setStatus("", "Ready to connect", "Credentials stay in your browser and are only used for Azure Speech REST calls.");
      }
    });
  });
}

function bindUiEffects() {
  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.disabled) return;

      const ripple = document.createElement("span");
      const rect = button.getBoundingClientRect();
      const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
      const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
      ripple.className = "click-ripple";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 540);
    });
  });

  document.querySelectorAll("input, textarea, select").forEach((field) => {
    const syncValueState = () => field.classList.toggle("has-value", Boolean(field.value));
    syncValueState();
    field.addEventListener("input", syncValueState);
    field.addEventListener("change", syncValueState);
  });
}

bindTheme();
bindTabs();
bindEvents();
bindUiEffects();
updateTranscriptStats();
setSpeechActionsEnabled(true);
