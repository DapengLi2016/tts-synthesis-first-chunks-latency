// Global variables
let allVoices = [];
let analysisData = [];
let charts = [];

// DOM elements
const regionInput = document.getElementById('region');
const subscriptionKeyInput = document.getElementById('subscriptionKey');
const languageSelect = document.getElementById('language');
const voiceSelect = document.getElementById('voice');
const outputFormatSelect = document.getElementById('outputFormat');
const sentenceCountInput = document.getElementById('sentenceCount');
const chunksToTrackInput = document.getElementById('chunksToTrack');
const loadVoicesBtn = document.getElementById('loadVoicesBtn');
const startAnalysisBtn = document.getElementById('startAnalysisBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');
const hardRefreshBtn = document.getElementById('hardRefreshBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const logContainer = document.getElementById('logContainer');

// Logging functions
function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Load voices from Azure
async function loadVoices() {
    const region = regionInput.value.trim();

    if (!region) {
        log('Please select a region', 'error');
        return;
    }

    try {
        log(`Loading voices from ${region}...`, 'info');
        loadVoicesBtn.disabled = true;

        // Use anonymous GET request to voice list API
        const url = `https://${region}.tts-frontend.speech.microsoft.com/synthesize/list/cognitive-service/voices`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to load voices: ${response.status} ${response.statusText}`);
        }

        allVoices = await response.json();
        log(`✓ Loaded ${allVoices.length} voices`, 'success');

        // Extract unique languages
        const languages = [...new Set(allVoices.map(v => v.Locale))].sort();
        log(`✓ Found ${languages.length} languages`, 'info');
        
        languageSelect.innerHTML = '<option value="">Select a language</option>';
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            languageSelect.appendChild(option);
        });

        // Auto-select en-US if available
        const defaultLocale = 'en-US';
        if (languages.includes(defaultLocale)) {
            languageSelect.value = defaultLocale;
            // Trigger change event to load voices
            languageSelect.dispatchEvent(new Event('change'));
            log(`✓ Auto-selected ${defaultLocale} locale`, 'info');
        }

        log('✓ Voices loaded successfully', 'success');
        loadVoicesBtn.disabled = false;
    } catch (error) {
        log(`✗ Error loading voices: ${error.message}`, 'error');
        log('Please verify the region is correct', 'warning');
        loadVoicesBtn.disabled = false;
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
    
    voiceSelect.innerHTML = '<option value="">Select a voice</option>';
    filteredVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.ShortName;
        option.textContent = `${voice.DisplayName} (${voice.Gender})`;
        voiceSelect.appendChild(option);
    });

    // Auto-select first voice
    if (filteredVoices.length > 0) {
        voiceSelect.value = filteredVoices[0].ShortName;
        log(`✓ Auto-selected voice: ${filteredVoices[0].DisplayName}`, 'info');
    }

    log(`Found ${filteredVoices.length} voices for ${selectedLanguage}`, 'info');
});

// Sample sentences for different languages
const sampleSentences = {
    'en-US': [
        'The quick brown fox jumps over the lazy dog.',
        'Artificial intelligence is transforming the way we live and work.',
        'Cloud computing enables scalable and flexible infrastructure.',
        'Machine learning algorithms can identify patterns in large datasets.',
        'Natural language processing helps computers understand human language.',
        'Voice synthesis technology has made significant advances in recent years.',
        'The Azure Speech Service provides powerful text-to-speech capabilities.',
        'Real-time audio streaming is essential for many applications.',
        'Latency measurement helps optimize performance and user experience.',
        'Analyzing chunk timing provides insights into synthesis behavior.'
    ],
    'zh-CN': [
        '人工智能正在改变我们的生活和工作方式。',
        '云计算提供可扩展和灵活的基础设施。',
        '机器学习算法可以识别大型数据集中的模式。',
        '自然语言处理帮助计算机理解人类语言。',
        '语音合成技术近年来取得了重大进展。',
        'Azure语音服务提供强大的文本转语音功能。',
        '实时音频流对许多应用程序至关重要。',
        '延迟测量有助于优化性能和用户体验。',
        '分析块时序可提供有关合成行为的见解。',
        '语音技术使人机交互更加自然流畅。'
    ],
    'default': [
        'This is a test sentence for speech synthesis.',
        'Text to speech technology is amazing.',
        'The Azure Speech Service is powerful.',
        'Real-time synthesis is important.',
        'Chunk analysis provides valuable insights.',
        'Latency measurement is crucial.',
        'Voice quality matters for user experience.',
        'Audio streaming enables many applications.',
        'Performance optimization is essential.',
        'Technology continues to advance rapidly.'
    ]
};

// Get sample sentences based on locale
function getSampleSentences(locale, count) {
    let sentences = sampleSentences[locale] || sampleSentences['default'];
    const result = [];
    
    for (let i = 0; i < count; i++) {
        result.push(sentences[i % sentences.length]);
    }
    
    return result;
}

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
        const synthesizer = new SpeechSDK.SpeechSynthesizer(config);
        const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'>${text}</voice></speak>`;
        
        const chunks = [];
        const startTime = performance.now();
        let firstChunkTime = null;
        
        synthesizer.synthesizing = (s, e) => {
            const chunkTime = performance.now();
            const timeOffset = chunkTime - startTime;
            
            if (firstChunkTime === null) {
                firstChunkTime = timeOffset;
            }
            
            if (chunks.length < chunksToTrack) {
                chunks.push({
                    chunkNumber: chunks.length + 1,
                    size: e.result.audioData.byteLength,
                    timeOffset: timeOffset,
                    audioOffset: e.result.audioDuration / 10000 // Convert to ms
                });
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
                        chunks: chunks,
                        totalTime: totalTime,
                        firstChunkTime: firstChunkTime,
                        totalSize: result.audioData.byteLength
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
async function startAnalysis() {
    const region = regionInput.value.trim();
    const subscriptionKey = subscriptionKeyInput.value.trim();
    const voice = voiceSelect.value;
    const language = languageSelect.value;
    const outputFormat = outputFormatSelect.value;
    const sentenceCount = parseInt(sentenceCountInput.value);
    const chunksToTrack = parseInt(chunksToTrackInput.value);

    if (!region || !subscriptionKey || !voice || !language) {
        log('Please fill in all required fields and select a voice', 'error');
        return;
    }

    try {
        startAnalysisBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        analysisData = [];
        
        // Clear previous charts
        charts.forEach(chart => chart.destroy());
        charts = [];

        log('Starting analysis...', 'info');
        log(`Configuration: Region=${region}, Voice=${voice}, Format=${outputFormat}, Sentences=${sentenceCount}`, 'info');

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, region);
        speechConfig.speechSynthesisOutputFormat = convertOutputFormat(outputFormat);

        const sentences = getSampleSentences(language, sentenceCount);

        // Synthesize sentences sequentially
        for (let i = 0; i < sentences.length; i++) {
            const progress = ((i + 1) / sentences.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Processing sentence ${i + 1} of ${sentences.length}...`;

            log(`Synthesizing sentence ${i + 1}: "${sentences[i].substring(0, 50)}..."`, 'info');

            try {
                const result = await synthesizeSentence(speechConfig, voice, sentences[i], i, chunksToTrack);
                analysisData.push(result);
                log(`Sentence ${i + 1} completed: ${result.chunks.length} chunks, ${result.totalTime.toFixed(2)}ms total`, 'success');
            } catch (error) {
                log(`Error synthesizing sentence ${i + 1}: ${error.message}`, 'error');
            }
        }

        progressText.textContent = 'Analysis complete!';
        log('Analysis completed successfully', 'success');

        displayResults();
        resultsSection.style.display = 'block';

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
    createChunkSizeChart();
    createLatencyChart();
    createFirstChunkLatencyChart();

    // Create detailed table
    createDetailedTable();
}

// Calculate statistics
function calculateStatistics() {
    const allFirstChunkTimes = analysisData.map(d => d.firstChunkTime);
    const allFirstChunkSizes = analysisData.map(d => d.chunks[0]?.size || 0);
    const allTotalTimes = analysisData.map(d => d.totalTime);

    return {
        avgFirstChunkLatency: average(allFirstChunkTimes),
        minFirstChunkLatency: Math.min(...allFirstChunkTimes),
        maxFirstChunkLatency: Math.max(...allFirstChunkTimes),
        avgFirstChunkSize: average(allFirstChunkSizes),
        avgTotalTime: average(allTotalTimes),
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
        </div>
    `;
    resultsContainer.appendChild(statsCard);
}

// Create chunk size chart
function createChunkSizeChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>Chunk Sizes Over Time</h3>
        <div class="chart-wrapper">
            <canvas id="chunkSizeChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    const ctx = document.getElementById('chunkSizeChart').getContext('2d');
    const datasets = analysisData.slice(0, 5).map((data, index) => ({
        label: `Sentence ${data.sentenceIndex}`,
        data: data.chunks.map(c => ({x: c.chunkNumber, y: c.size})),
        borderColor: getColor(index),
        backgroundColor: getColor(index, 0.2),
        tension: 0.1
    }));

    const chart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Chunk Size by Chunk Number (First 5 Sentences)' },
                legend: { position: 'top' }
            },
            scales: {
                x: { title: { display: true, text: 'Chunk Number' } },
                y: { title: { display: true, text: 'Size (bytes)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
}

// Create latency chart
function createLatencyChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>Chunk Latency Over Time</h3>
        <div class="chart-wrapper">
            <canvas id="latencyChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    const ctx = document.getElementById('latencyChart').getContext('2d');
    const datasets = analysisData.slice(0, 5).map((data, index) => ({
        label: `Sentence ${data.sentenceIndex}`,
        data: data.chunks.map(c => ({x: c.chunkNumber, y: c.timeOffset})),
        borderColor: getColor(index),
        backgroundColor: getColor(index, 0.2),
        tension: 0.1
    }));

    const chart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Time Offset by Chunk Number (First 5 Sentences)' },
                legend: { position: 'top' }
            },
            scales: {
                x: { title: { display: true, text: 'Chunk Number' } },
                y: { title: { display: true, text: 'Time Offset (ms)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
}

// Create first chunk latency chart
function createFirstChunkLatencyChart() {
    const chartCard = document.createElement('div');
    chartCard.className = 'chart-container';
    chartCard.innerHTML = `
        <h3>First Chunk Latency by Sentence</h3>
        <div class="chart-wrapper">
            <canvas id="firstChunkChart"></canvas>
        </div>
    `;
    resultsContainer.appendChild(chartCard);

    const ctx = document.getElementById('firstChunkChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: analysisData.map(d => `Sentence ${d.sentenceIndex}`),
            datasets: [{
                label: 'First Chunk Latency (ms)',
                data: analysisData.map(d => d.firstChunkTime),
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'First Chunk Latency for All Sentences' },
                legend: { display: false }
            },
            scales: {
                y: { title: { display: true, text: 'Latency (ms)' }, beginAtZero: true }
            }
        }
    });
    charts.push(chart);
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
                <th>Time Offset (ms)</th>
                <th>Audio Offset (ms)</th>
            </tr>
        </thead>
        <tbody id="detailTableBody"></tbody>
    `;
    tableCard.appendChild(table);
    resultsContainer.appendChild(tableCard);

    const tbody = document.getElementById('detailTableBody');
    analysisData.forEach(data => {
        data.chunks.forEach(chunk => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>Sentence ${data.sentenceIndex}</td>
                <td>${chunk.chunkNumber}</td>
                <td>${formatBytes(chunk.size)}</td>
                <td>${chunk.timeOffset.toFixed(2)}</td>
                <td>${chunk.audioOffset.toFixed(2)}</td>
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

// Generate CSV data
function generateCsvData() {
    let csv = 'Sentence Index,Sentence Text,Chunk Number,Chunk Size (bytes),Time Offset (ms),Audio Offset (ms),First Chunk Latency (ms),Total Time (ms),Total Size (bytes)\n';
    
    analysisData.forEach(data => {
        data.chunks.forEach(chunk => {
            csv += `${data.sentenceIndex},"${data.text.replace(/"/g, '""')}",${chunk.chunkNumber},${chunk.size},${chunk.timeOffset.toFixed(2)},${chunk.audioOffset.toFixed(2)},${data.firstChunkTime.toFixed(2)},${data.totalTime.toFixed(2)},${data.totalSize}\n`;
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

// Utility functions
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
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

// Event listenersregion is changed
regionInput.addEventListener('change', () => {
    const region = regionInput.value.trim();
    
    if (region) {
        log('Region selected, loading voices...', 'info');
        allVoices = []; // Clear existing voices
        languageSelect.innerHTML = '<option value="">Loading...</option>';
        voiceSelect.innerHTML = '<option value="">Select language first</option>';
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

loadVoicesBtn.addEventListener('click', loadVoices);
startAnalysisBtn.addEventListener('click', startAnalysis);
downloadCsvBtn.addEventListener('click', downloadCsvReport);
downloadChartBtn.addEventListener('click', downloadCharts);

// Load voices on page load with default region
window.addEventListener('DOMContentLoaded', () => {
    log('TTS Synthesis First Chunks Latency Analyzer ready', 'success');
    log('Loading voices from default region (East US)...', 'info');
    loadVoices();
});

// Initial log
log('Initializing...
    }
});

// Initial log
log('TTS Synthesis First Chunks Latency Analyzer ready', 'success');
log('Select region and enter your Azure Speech Service subscription key to begin', 'info');
