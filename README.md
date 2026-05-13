# Speech Studio Web

A browser-based Azure Speech Service demo with speech-to-text and text-to-speech tools. The app accepts your Azure Speech key, endpoint, and region directly in the page and uses Azure Speech REST endpoints from the browser.

## Features

- Speech-to-text recognition from your microphone
- Live captions with continuous recognition
- Text-to-speech with neural voice selection
- Speaking rate and pitch controls
- Generated audio preview and `.wav` download
- Speech capture for translation workflows
- Transcript copy, clear, and `.txt` download
- Dark theme with a light theme switch
- Responsive layout for desktop and mobile

## Files

- `index.html` - Page structure and controls
- `style.css` - Dark/light theme styling and responsive layout
- `script.js` - Azure Speech REST integration and UI behavior

## Requirements

- An Azure Speech resource
- A Speech resource key
- A Speech endpoint URL
- A modern browser with microphone permission enabled
- Internet access so the page can call Azure Speech REST endpoints

## How To Run

Open `index.html` in your browser:

```text
C:\Users\model\OneDrive\Desktop\ドキュメント\speech\index.html
```

Then enter your Azure Speech key, endpoint, and region on the left side of the page.
The region must match the key's resource location.

Example endpoint format:

```text
https://your-resource-name.cognitiveservices.azure.com
```

Some Azure Speech resources also show a regional endpoint like:

```text
https://centralindia.api.cognitive.microsoft.com
```

Use the full endpoint shown in your Azure Speech resource page.
For regional endpoints such as `centralindia.api.cognitive.microsoft.com`, the app automatically uses `centralindia` as the Azure Speech REST region. For resource endpoints such as `https://your-resource-name.cognitiveservices.azure.com`, enter the region manually.

If the page says Azure Speech could not be reached, refresh the browser and check that your internet connection, firewall, key, and region are correct.

## How To Use

1. Paste your Speech key.
2. Paste your Speech endpoint.
3. Enter the Speech resource region, such as `eastasia`.
4. Choose the recognition language.
5. Choose a tool:
   - Speech to text
   - Text to speech
   - Translate speech
6. Allow microphone access when the browser asks.

## Notes

- Your key is not saved by the app.
- Credentials are only kept in the current browser page while it is open.
- Microphone features require browser permission.
- Speech-to-text records a short microphone clip and sends it to Azure Speech REST.
- Text-to-speech sends SSML to Azure Speech REST and plays the returned WAV audio.
- Full translation requires an Azure Translator or multi-service resource; a Speech-only key does not translate text by itself.

## Customization Ideas

- Add more languages and neural voices.
- Add automatic language detection.
- Save previous transcripts in browser storage.
- Add file-based audio transcription.
- Connect the website to a backend so keys are never entered in the browser.
