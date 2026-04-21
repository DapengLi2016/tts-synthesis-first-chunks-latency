# TTS Synthesis First Chunks Latency Analyzer

A web-based playground portal for analyzing Azure Cognitive Services Text-to-Speech (TTS) synthesis first chunk latency and chunk size metrics.

## Overview

This tool helps AACS (Azure AI Content Safety) team analyze the timing and size of the first several chunks during TTS synthesis. It provides detailed metrics on:

- **Chunk Size**: Size of each audio chunk received during synthesis
- **Time Offset**: Timing from synthesis start to chunk receipt
- **Audio Offset**: Audio duration offset for each chunk
- **First Chunk Latency**: Time to receive the first audio chunk
- **Total Synthesis Time**: Complete synthesis duration

## Features

- 🎯 **Voice Selection**: Browse and select from all available Azure TTS voices by language
- 🎵 **Output Format Selection**: Choose from 13 different audio output formats
- 📊 **Real-time Analysis**: Sequential synthesis with chunk-level tracking
- 📈 **Visual Charts**: Interactive charts showing chunk sizes, latencies, and trends
- 📥 **Export Options**: 
  - Download detailed CSV reports
  - Download all charts as PNG images
- 📝 **Detailed Logging**: Real-time logs of synthesis progress and events

## Usage

### Prerequisites

- Azure Speech Service subscription key
- Modern web browser (Chrome, Edge, Firefox)

### Getting Started

1. **Open the Portal**
   - Open `index.html` in your web browser
   - Or serve via a local web server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     ```

2. **Configure Settings**
   - **Region**: Enter your Azure region (e.g., `eastus`, `westus2`)
   - **Subscription Key**: Enter your Azure Speech Service subscription key
   - **Number of Sentences**: Set how many sentences to synthesize (default: 10)
   - **Chunks to Track**: Set how many chunks to track per sentence (default: 10)

3. **Load Voices**
   - Click "Load Voices" button
   - Select your desired language from the dropdown
   - Select a voice from the filtered list

4. **Select Output Format**
   - Choose from available formats:
     - MP3 formats (16kHz, 24kHz, 48kHz with various bitrates)
     - PCM formats (16kHz, 24kHz, 48kHz)
     - WebM Opus formats (16kHz, 24kHz)

5. **Start Analysis**
   - Click "Start Analysis" button
   - Monitor progress in the progress bar
   - View real-time logs in the log section

6. **View Results**
   - Review overall statistics
   - Explore interactive charts:
     - Chunk Sizes Over Time
     - Chunk Latency Over Time
     - First Chunk Latency by Sentence
   - Browse detailed chunk data table

7. **Download Reports**
   - **Download CSV Report**: Export all chunk data to CSV
   - **Download Charts (PNG)**: Export all charts as PNG images

## Sample Sentences

The tool includes built-in sample sentences for common languages:

- **English (en-US)**: 10 technical sentences about AI, cloud computing, and speech synthesis
- **Chinese (zh-CN)**: 10 Chinese sentences covering similar topics
- **Other Languages**: Generic fallback sentences

## Output Format Options

| Format | Sample Rate | Bitrate | Container |
|--------|-------------|---------|-----------|
| Audio 16kHz 32kbps Mono MP3 | 16 kHz | 32 kbps | MP3 |
| Audio 16kHz 64kbps Mono MP3 | 16 kHz | 64 kbps | MP3 |
| Audio 16kHz 128kbps Mono MP3 | 16 kHz | 128 kbps | MP3 |
| Audio 24kHz 48kbps Mono MP3 | 24 kHz | 48 kbps | MP3 |
| Audio 24kHz 96kbps Mono MP3 | 24 kHz | 96 kbps | MP3 |
| Audio 24kHz 160kbps Mono MP3 | 24 kHz | 160 kbps | MP3 |
| Audio 48kHz 96kbps Mono MP3 | 48 kHz | 96 kbps | MP3 |
| Audio 48kHz 192kbps Mono MP3 | 48 kHz | 192 kbps | MP3 |
| RIFF 16kHz 16bit Mono PCM | 16 kHz | - | WAV |
| RIFF 24kHz 16bit Mono PCM | 24 kHz | - | WAV |
| RIFF 48kHz 16bit Mono PCM | 48 kHz | - | WAV |
| WebM 16kHz 16bit Mono Opus | 16 kHz | - | WebM |
| WebM 24kHz 16bit Mono Opus | 24 kHz | - | WebM |

## CSV Report Format

The exported CSV contains the following columns:

| Column | Description |
|--------|-------------|
| Sentence Index | Sequential sentence number |
| Sentence Text | The text that was synthesized |
| Chunk Number | Sequential chunk number within the sentence |
| Chunk Size (bytes) | Size of the audio chunk in bytes |
| Time Offset (ms) | Time from synthesis start to chunk receipt |
| Audio Offset (ms) | Audio duration offset for the chunk |
| First Chunk Latency (ms) | Time to receive first chunk |
| Total Time (ms) | Total synthesis time for the sentence |
| Total Size (bytes) | Total audio size for the sentence |

## Chart Exports

Three charts are generated and can be downloaded as PNG images:

1. **Chunk Sizes Over Time**: Line chart showing chunk sizes by chunk number for the first 5 sentences
2. **Chunk Latency Over Time**: Line chart showing time offsets for the first 5 sentences
3. **First Chunk Latency by Sentence**: Bar chart showing first chunk latency for all sentences

## Technical Details

### Architecture

- **Frontend**: Pure HTML/CSS/JavaScript
- **Speech SDK**: Azure Cognitive Services Speech SDK (browser bundle)
- **Charts**: Chart.js v4.4.0
- **Data Export**: Client-side CSV generation and canvas-to-image conversion

### Sequential Synthesis

The tool synthesizes sentences **one by one** (not concurrently) to ensure:
- Accurate timing measurements
- No resource contention
- Consistent baseline for comparison
- Clear per-sentence analysis

### Chunk Tracking

During synthesis, the tool captures:
- Each audio chunk received via the `synthesizing` event
- Precise timing using `performance.now()`
- Chunk size from `audioData.byteLength`
- Audio duration from SDK metadata

## API References

- **Voice List Endpoint**: `https://{region}.tts-frontend.speech.microsoft.com/synthesize/list/cognitive-service/voices`
- **Output Formats**: [SpeechSynthesisOutputFormat Documentation](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/microsoft-cognitiveservices-speech-namespace#speechsynthesisoutputformat)

## Troubleshooting

### Voices Not Loading
- Verify your subscription key is correct
- Check that the region matches your Azure Speech Service resource
- Ensure your browser allows CORS requests

### Synthesis Errors
- Confirm your subscription has available quota
- Check the browser console for detailed error messages
- Verify the selected voice supports the chosen language

### Chart Not Displaying
- Ensure JavaScript is enabled in your browser
- Check browser console for Chart.js loading errors
- Try refreshing the page

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Supported (may require HTTPS for microphone features)

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `app.js` - Application logic and TTS integration
- `README.md` - This documentation

## License

This tool is provided for internal AACS use for analyzing Azure Speech Service performance.

## Support

For issues or questions, contact the AACS team.
