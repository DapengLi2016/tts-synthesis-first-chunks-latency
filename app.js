// Global variables
let allVoices = [];
let analysisData = [];
let charts = [];
let analysisMetadata = {}; // Store metadata about the analysis

// DOM elements
const regionInput = document.getElementById('region');
const subscriptionKeyInput = document.getElementById('subscriptionKey');
const languageSelect = document.getElementById('language');
const voiceSelect = document.getElementById('voice');
const customVoiceInput = document.getElementById('customVoice');
const customVoiceContainer = document.getElementById('customVoiceContainer');
const outputFormatSelect = document.getElementById('outputFormat');
const textTypePlain = document.getElementById('textTypePlain');
const textTypeSSML = document.getElementById('textTypeSSML');
const sampleCountInput = document.getElementById('sampleCount');
const generateTextBtn = document.getElementById('generateTextBtn');
const textInput = document.getElementById('textInput');
const chunksToTrackInput = document.getElementById('chunksToTrack');
const startAnalysisBtn = document.getElementById('startAnalysisBtn');
const downloadFullDataBtn = document.getElementById('downloadFullDataBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const historyList = document.getElementById('historyList');
const hardRefreshBtn = document.getElementById('hardRefreshBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const logContainer = document.getElementById('logContainer');

// Sentences configuration
let sentencesConfig = {};

// Logging functions
function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Load sentences configuration
async function loadSentencesConfig() {
    try {
        const response = await fetch('sentences.json');
        if (!response.ok) {
            throw new Error('Failed to load sentences configuration');
        }
        sentencesConfig = await response.json();
        log('✅ Loaded sentences configuration', 'success');
    } catch (error) {
        log(`⚠️ Failed to load sentences config: ${error.message}`, 'warning');
        // Fallback to minimal config
        sentencesConfig = {
            'en-US': ['This is a test sentence for speech synthesis.'],
            'zh-CN': ['这是一个用于语音合成的测试句子。']
        };
    }
}

// Generate text (Plain Text or SSML)
function generateText() {
    const language = languageSelect.value;
    const voice = voiceSelect.value === 'custom' ? customVoiceInput.value.trim() : voiceSelect.value;
    const textType = textTypePlain.checked ? 'plain' : 'ssml';
    
    if (!language) {
        log('❌ Please select a language first', 'error');
        return;
    }
    
    if (!voice || voice === 'custom') {
        log('❌ Please select or enter a voice first', 'error');
        return;
    }
    
    // Get sentences for the selected language
    let sentences = sentencesConfig[language] || sentencesConfig['en-US'] || [];
    
    if (sentences.length === 0) {
        log('⚠️ No sentences available for this language, using default', 'warning');
        sentences = ['This is a test sentence.'];
    }
    
    // Get sample count from input
    const sampleCount = parseInt(sampleCountInput.value) || 10;
    
    // Randomly select sentences based on sample count
    const selectedSentences = [];
    const maxSentences = Math.min(sampleCount, sentences.length);
    const usedIndices = new Set();
    
    while (selectedSentences.length < maxSentences) {
        const randomIndex = Math.floor(Math.random() * sentences.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedSentences.push(sentences[randomIndex]);
        }
    }
    
    // Generate text based on type
    if (textType === 'plain') {
        textInput.value = selectedSentences.join('\n');
        log(`✅ Generated ${selectedSentences.length} plain text sentences`, 'success');
    } else {
        // Generate SSML - each SSML block separated by blank line
        const ssmlTexts = selectedSentences.map(text => {
            return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
    <voice name="${voice}">
        ${text}
    </voice>
</speak>`;
        });
        textInput.value = ssmlTexts.join('\n\n');
        log(`✅ Generated ${selectedSentences.length} SSML blocks (separated by blank lines)`, 'success');
    }
}

// Load voices from Azure (using REST API like AzureVoicePlayground)
async function loadVoices() {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();

    if (!region) {
        log('❌ Please select a region', 'error');
        return;
    }

    if (!subscriptionKey) {
        log('⚠️ Please enter subscription key to load voices', 'warning');
        log('💡 Subscription key is required to fetch voice list', 'info');
        return;
    }

    try {
        // Mask API key for display (show first 4 and last 4 characters)
        const maskedKey = subscriptionKey.length > 8
            ? `${subscriptionKey.substring(0, 4)}...${subscriptionKey.substring(subscriptionKey.length - 4)}`
            : '****';

        log(`🔄 Loading voices from ${region}...`, 'info');
        log(`🔑 API Key: ${maskedKey}`, 'info');
        
        // Show loading state
        languageSelect.disabled = true;
        voiceSelect.disabled = true;
        customVoiceInput.disabled = true;
        languageSelect.innerHTML = '<option value="">🔄 Loading voices...</option>';
        voiceSelect.innerHTML = '<option value="">Please wait...</option>';
        customVoiceContainer.style.display = 'none'; // Hide custom input during loading

        // Use Azure REST API (same as AzureVoicePlayground)
        const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
        log(`📡 API URL: ${url}`, 'info');
        
        const response = await fetch(url, {
            headers: {
                'Ocp-Apim-Subscription-Key': subscriptionKey,
            },
        });

        log(`📥 Response received: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        allVoices = data;
        log(`✓ Successfully loaded ${allVoices.length} voices`, 'success');

        if (!allVoices || allVoices.length === 0) {
            log('⚠️ No voices returned from API', 'warning');
            languageSelect.disabled = false;
            voiceSelect.disabled = false;
            customVoiceInput.disabled = false;
            languageSelect.innerHTML = '<option value="">No languages available</option>';
            voiceSelect.innerHTML = '<option value="">No voices available</option>';
            customVoiceContainer.style.display = 'none';
            return;
        }

        // Extract unique languages
        const languages = [...new Set(allVoices.map(v => v.Locale))].sort();
        log(`✓ Found ${languages.length} unique languages`, 'success');
        
        languageSelect.innerHTML = '<option value="">Select a language</option>';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            languageSelect.appendChild(option);
        });

        log(`✓ Added ${languages.length} languages to dropdown`, 'success');

        // Auto-select en-US if available
        const defaultLocale = 'en-US';
        if (languages.includes(defaultLocale)) {
            languageSelect.value = defaultLocale;
            log(`✓ Auto-selecting ${defaultLocale}...`, 'info');
            // Trigger change event to load voices
            languageSelect.dispatchEvent(new Event('change'));
        }

        log('✅ Voices loaded successfully!', 'success');
        languageSelect.disabled = false;
        voiceSelect.disabled = false;
        customVoiceInput.disabled = false;
    } catch (error) {
        log(`❌ Error loading voices: ${error.message}`, 'error');
        log('💡 Please verify your subscription key and region are correct', 'warning');
        
        // Reset to error state
        languageSelect.disabled = false;
        voiceSelect.disabled = false;
        customVoiceInput.disabled = false;
        languageSelect.innerHTML = '<option value="">❌ Failed to load - Check subscription key</option>';
        voiceSelect.innerHTML = '<option value="">❌ Failed to load voices</option>';
        customVoiceContainer.style.display = 'none';
    }
}

// Update voice list when language changes
languageSelect.addEventListener('change', () => {
    const selectedLanguage = languageSelect.value;
    
    if (!selectedLanguage) {
        voiceSelect.innerHTML = '<option value="">Select language first</option>';
        return;
    }

    const filteredVoices = allVoices.filter(v => v.Locale === selectedLanguage);
    
    log(`Filtering voices for ${selectedLanguage}, found ${filteredVoices.length} voices`, 'info');
    
    // Populate voice select with ShortName only
    voiceSelect.innerHTML = '';
    filteredVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.ShortName;
        option.textContent = voice.ShortName;  // Display ShortName directly
        voiceSelect.appendChild(option);
    });
    
    // Add "Custom..." option at the end
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom...';
    voiceSelect.appendChild(customOption);
    
    log(`Added ${filteredVoices.length} voices to dropdown`, 'success');

    // Auto-select first voice
    if (filteredVoices.length > 0) {
        voiceSelect.value = filteredVoices[0].ShortName;
        customVoiceContainer.style.display = 'none'; // Hide custom input by default
        log(`✓ Auto-selected voice: ${filteredVoices[0].ShortName}`, 'info');
    }

    log(`Found ${filteredVoices.length} voices for ${selectedLanguage}`, 'info');
});

// Show/hide custom voice input based on voice selection
voiceSelect.addEventListener('change', () => {
    if (voiceSelect.value === 'custom') {
        customVoiceContainer.style.display = 'block';
        customVoiceInput.focus(); // Auto-focus on custom input
        log('📝 Custom voice input enabled', 'info');
    } else {
        customVoiceContainer.style.display = 'none';
        customVoiceInput.value = ''; // Clear custom input when switching back
    }
});

// Convert output format to Speech SDK format
function convertOutputFormat(format) {
    const formatMap = {
        'audio-16khz-32kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3,
        'audio-16khz-64kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz64KBitRateMonoMp3,
        'audio-16khz-128kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3,
        'audio-24khz-48kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3,
        'audio-24khz-96kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3,
        'audio-24khz-160kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3,
        'audio-48khz-96kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio48Khz96KBitRateMonoMp3,
        'audio-48khz-192kbitrate-mono-mp3': SpeechSDK.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3,
        'riff-16khz-16bit-mono-pcm': SpeechSDK.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm,
        'riff-24khz-16bit-mono-pcm': SpeechSDK.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm,
        'riff-48khz-16bit-mono-pcm': SpeechSDK.SpeechSynthesisOutputFormat.Riff48Khz16BitMonoPcm,
        'webm-16khz-16bit-mono-opus': SpeechSDK.SpeechSynthesisOutputFormat.Webm16Khz16BitMonoOpus,
        'webm-24khz-16bit-mono-opus': SpeechSDK.SpeechSynthesisOutputFormat.Webm24Khz16BitMonoOpus
    };
    
    return formatMap[format] || SpeechSDK.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
}

// Synthesize single sentence and track chunks
async function synthesizeSentence(config, voiceName, text, sentenceIndex, chunksToTrack) {
    return new Promise((resolve, reject) => {
        // Use null audio config to prevent audio playback during analysis
        const synthesizer = new SpeechSDK.SpeechSynthesizer(config, null);
        
        // Check if text is already SSML (starts with <speak>)
        const isSSML = text.trim().startsWith('<speak');
        const ssml = isSSML ? text : `<speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'>${text}</voice></speak>`;
        
        const chunks = [];
        const startTime = performance.now();
        let firstChunkTime = null;
        let firstByteTime = null;
        let cumulativeBytes = 0;
        let lastChunkReceivedTime = null;
        let lastChunkSize = null;
        
        synthesizer.synthesizing = (s, e) => {
            const chunkReceivedTime = performance.now();
            const timeFromStart = chunkReceivedTime - startTime;
            
            // Record first byte time
            if (firstByteTime === null) {
                firstByteTime = timeFromStart;
                firstChunkTime = timeFromStart;
            }
            
            if (chunks.length < chunksToTrack) {
                const chunkSize = e.result.audioData.byteLength;
                
                // Calculate inter-chunk delay
                const interChunkDelay = lastChunkReceivedTime === null 
                    ? 0 
                    : chunkReceivedTime - lastChunkReceivedTime;
                
                // Update cumulative metrics
                cumulativeBytes += chunkSize;
                
                // Calculate chunk size change percentage
                const sizeChangePercent = lastChunkSize !== null
                    ? ((chunkSize - lastChunkSize) / lastChunkSize * 100)
                    : 0;
                
                chunks.push({
                    chunkNumber: chunks.length + 1,
                    length: chunkSize, // Chunk size in bytes
                    receivedTimeFromFirstByte: firstByteTime === null ? 0 : timeFromStart - firstByteTime, // Time from first byte to receiving this chunk
                    completedTimeFromFirstByte: timeFromStart - firstByteTime, // Time from first byte to completing this chunk (same as received for streaming)
                    timeOffset: timeFromStart, // Total time from synthesis start
                    
                    // New metrics
                    interChunkDelay: interChunkDelay, // Time between this chunk and previous chunk
                    cumulativeBytes: cumulativeBytes, // Total bytes received so far
                    sizeChangePercent: sizeChangePercent // Percentage change from previous chunk size
                });
                
                // Update tracking variables
                lastChunkReceivedTime = chunkReceivedTime;
                lastChunkSize = chunkSize;
            }
        };
        
        synthesizer.speakSsmlAsync(
            ssml,
            result => {
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                
                synthesizer.close();
                
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    resolve({
                        sentenceIndex: sentenceIndex + 1,
                        text: text,
                        ssml: ssml,
                        isSSML: isSSML,
                        chunks: chunks,
                        totalTime: totalTime,
                        firstChunkTime: firstChunkTime,
                        firstByteTime: firstByteTime,
                        totalSize: result.audioData.byteLength,
                        audioData: result.audioData // Save complete audio data
                    });
                } else {
                    reject(new Error(`Synthesis failed: ${result.errorDetails}`));
                }
            },
            error => {
                synthesizer.close();
                reject(error);
            }
        );
    });
}

// Start analysis
// Start analysis
async function startAnalysis() {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();
    // Use custom voice if "Custom..." is selected and custom input has value
    const selectedVoice = voiceSelect.value;
    const customVoice = customVoiceInput.value.trim();
    const voice = (selectedVoice === 'custom' && customVoice) ? customVoice : selectedVoice;
    const language = languageSelect.value;
    const outputFormat = outputFormatSelect.value;
    const chunksToTrack = parseInt(chunksToTrackInput.value);
    
    // Get texts from textarea based on text type
    const isSSML = textTypeSSML.checked;
    let texts;
    
    if (isSSML) {
        // SSML: Split by blank lines (double newline), trim and filter empty
        texts = textInput.value.split(/\n\s*\n/).map(block => block.trim()).filter(block => block.length > 0);
    } else {
        // Plain Text: One sentence per line
        texts = textInput.value.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }

    if (!region || !subscriptionKey || !voice || voice === 'custom' || !language) {
        log('Please fill in all required fields and select/enter a voice', 'error');
        return;
    }
    
    if (texts.length === 0) {
        log('❌ Please enter or generate text to synthesize', 'error');
        return;
    }

    if (selectedVoice === 'custom') {
        log(`Using custom voice: ${customVoice}`, 'info');
    } else {
        log(`Using selected voice: ${voice}`, 'info');
    }
    
    log(`Text Type: ${isSSML ? 'SSML' : 'Plain Text'}, Texts: ${texts.length}`, 'info');

    try {
        startAnalysisBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        analysisData = [];
        
        // Save analysis metadata
        analysisMetadata = {
            timestamp: new Date().toISOString(),
            region: region,
            voice: voice,
            language: language,
            outputFormat: outputFormat,
            textType: isSSML ? 'SSML' : 'Plain Text',
            chunksToTrack: chunksToTrack,
            totalTexts: texts.length
        };
        
        // Clear previous charts
        charts.forEach(chart => chart.destroy());
        charts = [];

        log('Starting analysis...', 'info');
        log(`Configuration: Region=${region}, Voice=${voice}, Format=${outputFormat}, Texts=${texts.length}`, 'info');

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, region);
        speechConfig.speechSynthesisOutputFormat = convertOutputFormat(outputFormat);

        // Synthesize texts sequentially
        for (let i = 0; i < texts.length; i++) {
            const progress = ((i + 1) / texts.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Processing text ${i + 1} of ${texts.length}...`;

            log(`Synthesizing text ${i + 1}: "${texts[i].substring(0, 50)}..."`, 'info');

            try {
                const result = await synthesizeSentence(speechConfig, voice, texts[i], i, chunksToTrack);
                analysisData.push(result);
                log(`Text ${i + 1} completed: ${result.chunks.length} chunks, ${result.totalTime.toFixed(2)}ms total`, 'success');
            } catch (error) {
                log(`Error synthesizing text ${i + 1}: ${error.message}`, 'error');
            }
        }

        progressText.textContent = 'Analysis complete!';
        log('Analysis completed successfully', 'success');

        displayResults();
        resultsSection.style.display = 'block';
        
        // Auto-save to history after analysis completes
        saveToHistory();

    } catch (error) {
        log(`Error during analysis: ${error.message}`, 'error');
    } finally {
        startAnalysisBtn.disabled = false;
    }
}

// Display results with charts
function displayResults() {
    resultsContainer.innerHTML = '';

    if (analysisData.length === 0) {
        resultsContainer.innerHTML = '<p>No data to display</p>';
        return;
    }

    // Calculate statistics
    const stats = calculateStatistics();
    displayStatistics(stats);

    // Create charts
    createFirstChunkLatencyDistribution();
    createAverageChunkSizeChart();
    createAverageChunkStartTimeChart();
    createAverageChunkCompleteTimeChart();

    // Create Top 10 Chunks statistics table
    createTop10ChunksStatsTable();

    // Create detailed table
    createDetailedTable();
}

// Calculate statistics
function calculateStatistics() {
    const allFirstChunkTimes = analysisData.map(d => d.firstChunkTime);
    const allFirstChunkSizes = analysisData.map(d => d.chunks[0]?.length || 0);
    const allTotalTimes = analysisData.map(d => d.totalTime);
    const allTotalSizes = analysisData.map(d => d.totalSize);

    return {
        avgFirstChunkLatency: average(allFirstChunkTimes),
        minFirstChunkLatency: Math.min(...allFirstChunkTimes),
        maxFirstChunkLatency: Math.max(...allFirstChunkTimes),
        avgFirstChunkSize: average(allFirstChunkSizes),
        avgTotalTime: average(allTotalTimes),
        avgTotalSize: average(allTotalSizes),
        totalSentences: analysisData.length
    };
}

// Display statistics
function displayStatistics(stats) {
    const statsCard = document.createElement('div');
    statsCard.className = 'result-card';
    statsCard.innerHTML = `
        <h3>Overall Statistics</h3>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Avg First Chunk Latency</div>
                <div class="stat-value">${stats.avgFirstChunkLatency.toFixed(2)} ms</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Min First Chunk Latency</div>
                <div class="stat-value">${stats.minFirstChunkLatency.toFixed(2)} ms</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Max First Chunk Latency</div>
                <div class="stat-value">${stats.maxFirstChunkLatency.toFixed(2)} ms</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg First Chunk Size</div>
                <div class="stat-value">${formatBytes(stats.avgFirstChunkSize)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg Total Time</div>
                <div class="stat-value">${stats.avgTotalTime.toFixed(2)} ms</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Total Sentences</div>
                <div class="stat-value">${stats.totalSentences}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Avg File Size</div>
                <div class="stat-value">${formatBytes(stats.avgTotalSize)}</div>
            </div>
        </div>
    `;
    resultsContainer.appendChild(statsCard);
}

// Create first chunk latency distribution histogram
function createFirstChunkLatencyDistribution() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>First Chunk Latency Distribution</h3>
        <div class="chart-wrapper">
            <canvas id="latencyDistributionChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    // Get all first chunk latencies
    const latencies = analysisData.map(d => d.firstChunkTime);
    
    // Calculate statistics
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    
    // Create histogram bins (auto-calculate bin size)
    const binCount = Math.min(20, Math.ceil(Math.sqrt(latencies.length)));
    const binSize = (max - min) / binCount;
    const bins = Array(binCount).fill(0);
    const binLabels = [];
    
    for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        binLabels.push(`${binStart.toFixed(0)}-${binEnd.toFixed(0)}`);
        
        // Count latencies in this bin
        bins[i] = latencies.filter(l => l >= binStart && l < binEnd).length;
    }
    
    // Handle edge case: last bin should include max value
    const lastBinStart = min + (binCount - 1) * binSize;
    bins[binCount - 1] = latencies.filter(l => l >= lastBinStart && l <= max).length;

    const ctx = document.getElementById('latencyDistributionChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Frequency',
                data: bins,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { 
                    display: true, 
                    text: `First Chunk Latency Distribution (Mean: ${mean.toFixed(2)}ms, Median: ${median.toFixed(2)}ms)` 
                },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Count: ${context.parsed.y} sentences`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    title: { display: true, text: 'Latency Range (ms)' }
                },
                y: { 
                    title: { display: true, text: 'Frequency (Number of Sentences)' }, 
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    charts.push(chart);
    
    // Add description for latency distribution chart
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Chart Description (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>X-Axis (Latency Range):</strong> Time intervals (in milliseconds) showing how long it took to receive the first chunk. The range is automatically divided into bins for better visualization.</p>
            <p style="margin: 8px 0;"><strong>Y-Axis (Frequency):</strong> Number of sentences that fall into each latency range. This shows the distribution pattern of first chunk latencies.</p>
            <p style="margin: 8px 0;"><strong>Mean:</strong> The average first chunk latency across all analyzed sentences.</p>
            <p style="margin: 8px 0;"><strong>Median:</strong> The middle value when all first chunk latencies are sorted. This is less affected by outliers than the mean.</p>
            <p style="margin: 8px 0; color: #666; font-style: italic;">This histogram helps identify whether first chunk latencies are consistent or have high variance.</p>
        </div>
    `;
    chartCard.appendChild(description);
}

// Create Average Chunk Size chart
function createAverageChunkSizeChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>Average Chunk Size by Chunk Number</h3>
        <div class="chart-wrapper">
            <canvas id="avgChunkSizeChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    // Calculate average size for each chunk position
    const maxChunks = Math.min(20, Math.max(...analysisData.map(d => d.chunks.length)));
    const chunkData = [];
    
    for (let i = 0; i < maxChunks; i++) {
        const chunksAtPosition = analysisData
            .filter(d => d.chunks[i])
            .map(d => d.chunks[i]);
        
        if (chunksAtPosition.length > 0) {
            const avgSize = average(chunksAtPosition.map(c => c.length));
            chunkData.push({ x: i + 1, y: avgSize, count: chunksAtPosition.length });
        }
    }

    const ctx = document.getElementById('avgChunkSizeChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chunkData.map(d => `Chunk ${d.x} (${d.count})`),
            datasets: [{
                label: 'Average Size',
                data: chunkData.map(d => d.y),
                backgroundColor: 'rgba(40, 167, 69, 0.6)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Average Chunk Size Across All Sentences' },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            return `Avg Size: ${context.parsed.y.toFixed(0)} bytes (from ${chunkData[dataIndex].count} sentences)`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Chunk Number (Sample Count)' } },
                y: { title: { display: true, text: 'Average Size (bytes)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
    
    // Add description for average chunk size chart
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Chart Description (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>X-Axis (Chunk Number):</strong> The sequential position of each chunk (1st chunk, 2nd chunk, etc.). The number in parentheses (e.g., "Chunk 1 (10)") indicates how many sentences were used to calculate the average for that chunk position.</p>
            <p style="margin: 8px 0;"><strong>Y-Axis (Average Size):</strong> The average size in bytes of chunks at each position, calculated across all sentences that have a chunk at that position.</p>
            <p style="margin: 8px 0; color: #666; font-style: italic;">This chart shows whether chunk sizes are consistent or vary by position. If later chunks have fewer samples, it means not all sentences generated that many chunks within the tracking limit.</p>
        </div>
    `;
    chartCard.appendChild(description);
}

// Create Average Chunk Start Receive Time chart
function createAverageChunkStartTimeChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>Average Chunk Start Receive Time by Chunk Number</h3>
        <div class="chart-wrapper">
            <canvas id="avgChunkStartTimeChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    // Calculate average receive time for each chunk position
    const maxChunks = Math.min(20, Math.max(...analysisData.map(d => d.chunks.length)));
    const chunkData = [];
    
    for (let i = 0; i < maxChunks; i++) {
        const chunksAtPosition = analysisData
            .filter(d => d.chunks[i])
            .map(d => d.chunks[i]);
        
        if (chunksAtPosition.length > 0) {
            // Calculate start receive time: timeOffset - interChunkDelay
            // For first chunk, this is just timeOffset (since interChunkDelay is 0)
            const avgTime = average(chunksAtPosition.map(c => c.timeOffset - c.interChunkDelay));
            chunkData.push({ x: i + 1, y: avgTime, count: chunksAtPosition.length });
        }
    }

    const ctx = document.getElementById('avgChunkStartTimeChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chunkData.map(d => `Chunk ${d.x} (${d.count})`),
            datasets: [{
                label: 'Average Start Receive Time',
                data: chunkData.map(d => d.y),
                borderColor: 'rgba(220, 53, 69, 1)',
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Average Time When Each Chunk Starts Being Received' },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            return `Avg Time: ${context.parsed.y.toFixed(2)} ms (from ${chunkData[dataIndex].count} sentences)`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Chunk Number (Sample Count)' } },
                y: { title: { display: true, text: 'Average Start Receive Time (ms)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
    
    // Add description for average chunk time chart
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Chart Description (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>X-Axis (Chunk Number):</strong> The sequential position of each chunk. The number in parentheses (e.g., "Chunk 1 (10)") shows how many sentences contributed to the average at that position.</p>
            <p style="margin: 8px 0;"><strong>Y-Axis (Average Start Receive Time):</strong> The average time (in milliseconds from synthesis start) when chunks at each position started being received. This represents when the chunk transmission began, not when it completed.</p>
            <p style="margin: 8px 0;"><strong>Expected Pattern:</strong> The line should show an increasing trend, as later chunks naturally start arriving later in the synthesis process.</p>
            <p style="margin: 8px 0; color: #666; font-style: italic;">This chart helps visualize the pacing of chunk delivery. Steeper slopes indicate faster chunk arrival, while plateaus may indicate delays.</p>
        </div>
    `;
    chartCard.appendChild(description);
}

// Create Average Chunk Complete Receive Time chart
function createAverageChunkCompleteTimeChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>Average Chunk Complete Receive Time by Chunk Number</h3>
        <div class="chart-wrapper">
            <canvas id="avgChunkCompleteTimeChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    // Calculate average complete receive time for each chunk position
    const maxChunks = Math.min(20, Math.max(...analysisData.map(d => d.chunks.length)));
    const chunkData = [];
    
    for (let i = 0; i < maxChunks; i++) {
        const chunksAtPosition = analysisData
            .filter(d => d.chunks[i])
            .map(d => d.chunks[i]);
        
        if (chunksAtPosition.length > 0) {
            // Use timeOffset which represents when chunk reception completed
            const avgTime = average(chunksAtPosition.map(c => c.timeOffset));
            chunkData.push({ x: i + 1, y: avgTime, count: chunksAtPosition.length });
        }
    }

    const ctx = document.getElementById('avgChunkCompleteTimeChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chunkData.map(d => `Chunk ${d.x} (${d.count})`),
            datasets: [{
                label: 'Average Complete Receive Time',
                data: chunkData.map(d => d.y),
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Average Time When Each Chunk Completes Reception' },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            return `Avg Time: ${context.parsed.y.toFixed(2)} ms (from ${chunkData[dataIndex].count} sentences)`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Chunk Number (Sample Count)' } },
                y: { title: { display: true, text: 'Average Complete Receive Time (ms)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
    
    // Add description for average chunk complete time chart
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Chart Description (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>X-Axis (Chunk Number):</strong> The sequential position of each chunk. The number in parentheses (e.g., "Chunk 1 (10)") shows how many sentences contributed to the average at that position.</p>
            <p style="margin: 8px 0;"><strong>Y-Axis (Average Complete Receive Time):</strong> The average time (in milliseconds from synthesis start) when chunks at each position completed reception. This represents when the entire chunk was fully received.</p>
            <p style="margin: 8px 0;"><strong>Expected Pattern:</strong> The line should show an increasing trend, as later chunks naturally complete later in the synthesis process. Compare with the Start Receive Time chart to see chunk transmission duration.</p>
            <p style="margin: 8px 0; color: #666; font-style: italic;">This chart, paired with the Start Receive Time chart, helps visualize both when chunks begin and end transmission. The gap between the two indicates chunk transfer time.</p>
        </div>
    `;
    chartCard.appendChild(description);
}

// Create Top 10 Chunks statistics table
function createTop10ChunksStatsTable() {
    const tableCard = document.createElement('div');
    tableCard.className = 'result-card';
    tableCard.innerHTML = '<h3>Top 10 Chunks Statistics (Average ± Std Dev)</h3>';
    
    // Determine maximum number of chunks (up to 10)
    const maxChunks = Math.min(10, Math.max(...analysisData.map(d => d.chunks.length)));
    
    // Calculate stats for each chunk position
    const chunkStats = [];
    for (let i = 0; i < maxChunks; i++) {
        const chunkNumber = i + 1;
        
        // Collect all chunks at this position
        const chunksAtPosition = analysisData
            .filter(d => d.chunks[i])
            .map(d => d.chunks[i]);
        
        if (chunksAtPosition.length === 0) continue;
        
        // Extract metrics
        const lengths = chunksAtPosition.map(c => c.length);
        const timeOffsets = chunksAtPosition.map(c => c.timeOffset);
        const interChunkDelays = chunksAtPosition.map(c => c.interChunkDelay);
        
        chunkStats.push({
            chunkNumber: chunkNumber,
            lengthAvg: average(lengths),
            lengthStd: standardDeviation(lengths),
            timeOffsetAvg: average(timeOffsets),
            timeOffsetStd: standardDeviation(timeOffsets),
            interChunkDelayAvg: average(interChunkDelays),
            interChunkDelayStd: standardDeviation(interChunkDelays)
        });
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'result-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Chunk #</th>
                <th>Size (bytes)</th>
                <th>Time from Start (ms)</th>
                <th>Inter-Chunk Delay (ms)</th>
            </tr>
        </thead>
        <tbody>
            ${chunkStats.map(stat => `
                <tr>
                    <td>${stat.chunkNumber}</td>
                    <td>${stat.lengthAvg.toFixed(0)} ± ${stat.lengthStd.toFixed(0)}</td>
                    <td>${stat.timeOffsetAvg.toFixed(2)} ± ${stat.timeOffsetStd.toFixed(2)}</td>
                    <td>${stat.interChunkDelayAvg.toFixed(2)} ± ${stat.interChunkDelayStd.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    tableCard.appendChild(table);
    
    // Add column descriptions
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Column Descriptions (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>Chunk #:</strong> The sequential number of the chunk (1st chunk, 2nd chunk, etc.)</p>
            <p style="margin: 8px 0;"><strong>Size (bytes):</strong> The size of the audio data chunk in bytes. Shows average ± standard deviation across all sentences.</p>
            <p style="margin: 8px 0;"><strong>Time from Start (ms):</strong> The elapsed time from synthesis start to when this chunk was received (in milliseconds). This measures the total latency including network and processing time.</p>
            <p style="margin: 8px 0;"><strong>Inter-Chunk Delay (ms):</strong> The time interval between receiving the previous chunk and this chunk (in milliseconds). For the first chunk, this value is 0. This metric helps identify delays or jitter in the chunk delivery stream.</p>
            <p style="margin: 8px 0; color: #666; font-style: italic;">All values show: Average ± Standard Deviation calculated across all analyzed sentences.</p>
        </div>
    `;
    tableCard.appendChild(description);
    
    resultsContainer.appendChild(tableCard);
}

// Create detailed table
function createDetailedTable() {
    const tableCard = document.createElement('div');
    tableCard.className = 'result-card';
    tableCard.innerHTML = '<h3>Detailed Chunk Data</h3>';
    
    const table = document.createElement('table');
    table.className = 'result-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Sentence</th>
                <th>Chunk #</th>
                <th>Size</th>
                <th>Start Receive (ms)</th>
                <th>Complete Receive (ms)</th>
                <th>Inter-Chunk Delay (ms)</th>
            </tr>
        </thead>
        <tbody id="detailTableBody"></tbody>
    `;
    tableCard.appendChild(table);
    
    // Add column descriptions for detailed table
    const description = document.createElement('details');
    description.style.marginTop = '15px';
    description.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; color: #667eea; padding: 8px 0;">
            📊 Column Descriptions (Click to expand)
        </summary>
        <div style="margin-top: 10px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; line-height: 1.8;">
            <p style="margin: 8px 0;"><strong>Sentence:</strong> Which sentence this chunk belongs to</p>
            <p style="margin: 8px 0;"><strong>Chunk #:</strong> The sequential number of the chunk within this sentence</p>
            <p style="margin: 8px 0;"><strong>Size:</strong> The size of this audio chunk in bytes</p>
            <p style="margin: 8px 0;"><strong>Start Receive (ms):</strong> Time from synthesis start when this chunk started being received. For the first chunk, this is when the first byte arrived.</p>
            <p style="margin: 8px 0;"><strong>Complete Receive (ms):</strong> Time from synthesis start when this chunk was fully received</p>
            <p style="margin: 8px 0;"><strong>Inter-Chunk Delay (ms):</strong> Time interval between receiving the previous chunk and this chunk. For the first chunk, this is 0. Helps identify delays or jitter in chunk delivery.</p>
        </div>
    `;
    tableCard.appendChild(description);
    
    resultsContainer.appendChild(tableCard);

    const tbody = document.getElementById('detailTableBody');
    analysisData.forEach(data => {
        data.chunks.forEach(chunk => {
            const row = tbody.insertRow();
            const startReceiveTime = chunk.timeOffset - chunk.interChunkDelay;
            row.innerHTML = `
                <td>Sentence ${data.sentenceIndex}</td>
                <td>${chunk.chunkNumber}</td>
                <td>${formatBytes(chunk.length)}</td>
                <td>${startReceiveTime.toFixed(2)}</td>
                <td>${chunk.timeOffset.toFixed(2)}</td>
                <td>${chunk.interChunkDelay.toFixed(2)}</td>
            `;
        });
    });
}

// Download CSV report
function downloadCsvReport() {
    const csv = generateCsvData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `tts-chunks-analysis-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    log('CSV report downloaded', 'success');
}

// Download full data report (JSON)
async function downloadFullDataReport() {
    if (analysisData.length === 0) {
        log('⚠️ No data available to download', 'warning');
        return;
    }
    
    log('📦 Preparing complete package...', 'info');
    
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    // 1. Add JSON file
    const fullData = {
        metadata: analysisMetadata,
        results: analysisData.map(item => ({
            sentenceIndex: item.sentenceIndex,
            plainText: item.isSSML ? null : item.text,
            ssmlText: item.ssml,
            isSSML: item.isSSML,
            totalTime: item.totalTime,
            firstByteTime: item.firstByteTime,
            firstChunkTime: item.firstChunkTime,
            totalSize: item.totalSize,
            audioFileName: `audio_sentence_${item.sentenceIndex}.wav`,
            chunks: item.chunks.map(chunk => ({
                chunkNumber: chunk.chunkNumber,
                length: chunk.length,
                receivedTimeFromFirstByte: chunk.receivedTimeFromFirstByte,
                completedTimeFromFirstByte: chunk.completedTimeFromFirstByte,
                timeOffset: chunk.timeOffset,
                // Additional metrics
                interChunkDelay: chunk.interChunkDelay,
                cumulativeBytes: chunk.cumulativeBytes,
                sizeChangePercent: chunk.sizeChangePercent
            }))
        }))
    };
    
    const json = JSON.stringify(fullData, null, 2);
    zip.file('analysis-data.json', json);
    
    // 2. Add CSV file
    const csv = generateCsvData();
    zip.file('analysis-data.csv', csv);
    
    // 3. Add audio files
    const audioFolder = zip.folder('audio');
    analysisData.forEach(item => {
        if (item.audioData) {
            audioFolder.file(`audio_sentence_${item.sentenceIndex}.wav`, item.audioData);
        }
    });
    
    // 4. Add chart images
    const chartsFolder = zip.folder('charts');
    for (let i = 0; i < charts.length; i++) {
        const canvas = charts[i].canvas;
        const chartTitle = charts[i].options.plugins.title.text || `Chart ${i + 1}`;
        const sanitizedTitle = chartTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
        
        // Convert canvas to base64 PNG
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        
        chartsFolder.file(`${i + 1}_${sanitizedTitle}.png`, base64Data, { base64: true });
    }
    
    // 5. Generate and download zip
    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `tts-analysis-package-${timestamp}.zip`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        log(`✅ Package downloaded: JSON + CSV + ${analysisData.length} audio files + ${charts.length} charts`, 'success');
    } catch (error) {
        log(`❌ Failed to create zip: ${error.message}`, 'error');
    }
}

// Generate CSV data
function generateCsvData() {
    let csv = 'Sentence Index,Sentence Text,Chunk Number,Chunk Size (bytes),Start Receive (ms),Complete Receive (ms),Inter-Chunk Delay (ms),First Chunk Latency (ms),Total Time (ms),Total Size (bytes),Cumulative Bytes,Size Change %\n';
    
    analysisData.forEach(data => {
        data.chunks.forEach(chunk => {
            const startReceiveTime = chunk.timeOffset - chunk.interChunkDelay;
            csv += `${data.sentenceIndex},"${data.text.replace(/"/g, '""')}",${chunk.chunkNumber},${chunk.length},${startReceiveTime.toFixed(2)},${chunk.timeOffset.toFixed(2)},${chunk.interChunkDelay.toFixed(2)},${data.firstChunkTime.toFixed(2)},${data.totalTime.toFixed(2)},${data.totalSize},${chunk.cumulativeBytes},${chunk.sizeChangePercent.toFixed(2)}\n`;
        });
    });
    
    return csv;
}

// Download charts as PNG
async function downloadCharts() {
    log('Preparing chart downloads...', 'info');
    
    for (let i = 0; i < charts.length; i++) {
        const canvas = charts[i].canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `tts-chart-${i + 1}-${new Date().toISOString().split('T')[0]}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    log(`${charts.length} charts downloaded`, 'success');
}

// History Management Functions
function saveToHistory() {
    if (analysisData.length === 0) {
        // Don't log warning when auto-saving with no data
        return;
    }

    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        config: {
            region: regionInput.value,
            // Do NOT save subscription key for security
            language: languageSelect.value,
            voice: voiceSelect.value === 'custom' ? customVoiceInput.value : voiceSelect.value,
            outputFormat: outputFormatSelect.value,
            chunksToTrack: parseInt(chunksToTrackInput.value),
            textType: textTypeSSML.checked ? 'SSML' : 'Plain Text'
        },
        metadata: analysisMetadata,
        results: analysisData.map(item => ({
            sentenceIndex: item.sentenceIndex,
            text: item.text,
            ssml: item.ssml,
            isSSML: item.isSSML,
            totalTime: item.totalTime,
            firstByteTime: item.firstByteTime,
            firstChunkTime: item.firstChunkTime,
            totalSize: item.totalSize,
            chunks: item.chunks
        }))
    };

    // Get existing history from localStorage
    const history = getHistory();
    history.unshift(historyItem);
    
    // Keep only last 20 items
    if (history.length > 20) {
        history.splice(20);
    }

    localStorage.setItem('ttsAnalysisHistory', JSON.stringify(history));
    log(`✅ Saved to history (${history.length} items total)`, 'success');
}

function getHistory() {
    const stored = localStorage.getItem('ttsAnalysisHistory');
    return stored ? JSON.parse(stored) : [];
}

function showHistoryModal() {
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No history records found</p>';
    } else {
        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-header">
                    <span class="history-date">${new Date(item.timestamp).toLocaleString()}</span>
                    <div class="history-actions">
                        <button class="btn btn-sm btn-info" onclick="loadHistoryItem(${item.id})">📂 Load</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteHistoryItem(${item.id})">🗑️ Delete</button>
                    </div>
                </div>
                <div class="history-details">
                    <p><strong>Voice:</strong> ${item.config.voice}</p>
                    <p><strong>Language:</strong> ${item.config.language}</p>
                    <p><strong>Sentences:</strong> ${item.results.length}</p>
                    <p><strong>Avg First Chunk:</strong> ${item.results.length > 0 ? (item.results.reduce((sum, r) => sum + r.firstChunkTime, 0) / item.results.length).toFixed(2) : 'N/A'} ms</p>
                </div>
            </div>
        `).join('');
    }
    
    historyModal.style.display = 'flex';
}

function hideHistoryModal() {
    historyModal.style.display = 'none';
}

function loadHistoryItem(id) {
    const history = getHistory();
    const item = history.find(h => h.id === id);
    
    if (!item) {
        log('⚠️ History item not found', 'warning');
        return;
    }

    // Restore configuration (except subscription key)
    regionInput.value = item.config.region;
    languageSelect.value = item.config.language;
    
    if (item.config.voice && allVoices.length > 0) {
        const voiceOption = Array.from(voiceSelect.options).find(opt => opt.value === item.config.voice);
        if (voiceOption) {
            voiceSelect.value = item.config.voice;
        } else {
            voiceSelect.value = 'custom';
            customVoiceInput.value = item.config.voice;
            customVoiceContainer.style.display = 'block';
        }
    }
    
    outputFormatSelect.value = item.config.outputFormat;
    chunksToTrackInput.value = item.config.chunksToTrack;
    
    if (item.config.textType === 'SSML') {
        textTypeSSML.checked = true;
        textTypePlain.checked = false;
    } else {
        textTypePlain.checked = true;
        textTypeSSML.checked = false;
    }

    // Restore data
    analysisData = item.results;
    analysisMetadata = item.metadata;

    // Display results
    displayResults();
    hideHistoryModal();
    
    log(`📂 Loaded history from ${new Date(item.timestamp).toLocaleString()}`, 'success');
    log('⚠️ Note: Subscription key was not restored for security reasons', 'warning');
}

function deleteHistoryItem(id) {
    if (!confirm('Are you sure you want to delete this history item?')) {
        return;
    }

    const history = getHistory();
    const filtered = history.filter(h => h.id !== id);
    localStorage.setItem('ttsAnalysisHistory', JSON.stringify(filtered));
    
    showHistoryModal(); // Refresh the list
    log('🗑️ History item deleted', 'info');
}

// Make functions available globally for onclick handlers
window.loadHistoryItem = loadHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;

// Utility functions
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
    const avg = average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getColor(index, alpha = 1) {
    const colors = [
        `rgba(102, 126, 234, ${alpha})`,
        `rgba(118, 75, 162, ${alpha})`,
        `rgba(40, 167, 69, ${alpha})`,
        `rgba(255, 193, 7, ${alpha})`,
        `rgba(220, 53, 69, ${alpha})`
    ];
    return colors[index % colors.length];
}

// Event listeners - Auto-load voices when region or subscription key changes
regionInput.addEventListener('change', () => {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();
    
    if (region && subscriptionKey) {
        log('Region changed, reloading voices...', 'info');
        allVoices = []; // Clear existing voices
        languageSelect.innerHTML = '<option value="">🔄 Loading voices...</option>';
        voiceSelect.innerHTML = '<option value="">Please wait...</option>';
        customVoiceInput.value = '';
        customVoiceContainer.style.display = 'none'; // Hide custom input
        loadVoices();
    } else if (region && !subscriptionKey) {
        log('💡 Enter subscription key to load voices for this region', 'info');
        languageSelect.innerHTML = '<option value="">🔑 Enter subscription key first</option>';
        voiceSelect.innerHTML = '<option value="">🔑 Enter subscription key first</option>';
        customVoiceInput.value = '';
        customVoiceContainer.style.display = 'none'; // Hide custom input
    }
});

// Auto-load voices when subscription key is entered
subscriptionKeyInput.addEventListener('input', () => {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();
    
    // Auto-load when key length suggests it's complete (typical Azure key is 32 chars)
    if (region && subscriptionKey.length >= 32 && allVoices.length === 0) {
        log('🔑 Subscription key detected, loading voices...', 'info');
        loadVoices();
    }
});

subscriptionKeyInput.addEventListener('blur', () => {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();
    
    if (region && subscriptionKey && allVoices.length === 0) {
        log('🔑 Loading voices with subscription key...', 'info');
        loadVoices();
    }
});

// Hard refresh button - clears cache and reloads
hardRefreshBtn.addEventListener('click', () => {
    log('Performing hard refresh...', 'info');
    // Clear cache and reload
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    // Force reload from server
    window.location.reload(true);
});

startAnalysisBtn.addEventListener('click', startAnalysis);
downloadFullDataBtn.addEventListener('click', downloadFullDataReport);
viewHistoryBtn.addEventListener('click', showHistoryModal);
closeHistoryModal.addEventListener('click', hideHistoryModal);
generateTextBtn.addEventListener('click', generateText);

// Text Type radio button change handler
textTypePlain.addEventListener('change', () => {
    if (textTypePlain.checked && textInput.value) {
        log('💡 Switched to Plain Text mode. Remember: one sentence per line', 'info');
    }
});

textTypeSSML.addEventListener('change', () => {
    if (textTypeSSML.checked && textInput.value) {
        log('💡 Switched to SSML mode. Remember: separate SSML blocks with blank lines', 'info');
    }
});

// Load voices on page load with default region
window.addEventListener('DOMContentLoaded', () => {
    log('🚀 TTS Synthesis First Chunks Latency Analyzer ready', 'success');
    log(`🔧 Default region: ${regionInput.value}`, 'info');
    log('💡 Enter your subscription key to load voice list', 'info');
    
    // Load sentences configuration
    loadSentencesConfig();
});
