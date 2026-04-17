# Speech Studio Web

A browser-based Azure Speech Service demo with speech-to-text, text-to-speech, and speech translation tools. The app accepts your Azure Speech key and endpoint directly in the page and uses the Microsoft Speech SDK from the browser.

## Features

- Speech-to-text recognition from your microphone
- Live captions with continuous recognition
- Text-to-speech with neural voice selection
- Speaking rate and pitch controls
- Generated audio preview and `.wav` download
- Speech translation into multiple languages
- Transcript copy, clear, and `.txt` download
- Dark theme with a light theme switch
- Responsive layout for desktop and mobile

## Files

- `index.html` - Page structure and controls
- `style.css` - Dark/light theme styling and responsive layout
- `script.js` - Azure Speech SDK integration and UI behavior

## Requirements

- An Azure Speech resource
- A Speech resource key
- A Speech endpoint URL
- A modern browser with microphone permission enabled
- Internet access, because the page loads the Azure Speech SDK from Microsoft

## How To Run

Open `index.html` in your browser:

```text
C:\Users\model\OneDrive\Desktop\ドキュメント\speech\index.html
```

Then enter your Azure Speech key and endpoint on the left side of the page.

Example endpoint format:

```text
https://your-resource-name.cognitiveservices.azure.com
```

Some Azure Speech resources also show a regional endpoint like:

```text
https://centralindia.api.cognitive.microsoft.com
```

Use the full endpoint shown in your Azure Speech resource page.

If the page says the Speech SDK could not be reached, refresh the browser and check that your internet connection, firewall, or browser extensions are not blocking scripts from Microsoft or jsDelivr.

## How To Use

1. Paste your Speech key.
2. Paste your Speech endpoint.
3. Choose the recognition language.
4. Choose a tool:
   - Speech to text
   - Text to speech
   - Translate speech
5. Allow microphone access when the browser asks.

## Notes

- Your key is not saved by the app.
- Credentials are only kept in the current browser page while it is open.
- Microphone features require browser permission.
- If the Speech SDK does not load, check your internet connection.

## Customization Ideas

- Add more languages and neural voices.
- Add automatic language detection.
- Save previous transcripts in browser storage.
- Add file-based audio transcription.
- Connect the website to a backend so keys are never entered in the browser.
