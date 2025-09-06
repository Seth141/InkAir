"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealVoiceInputHandler = void 0;
const mic_1 = __importDefault(require("mic"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class RealVoiceInputHandler {
    constructor(session, samAssistant) {
        this.isRunning = false;
        this.micInstance = null;
        this.audioFilePath = path_1.default.join(__dirname, 'voice_input.wav');
        this.session = session;
        this.samAssistant = samAssistant;
    }
    startListening() {
        this.isRunning = true;
        console.log('Real voice input handler started. Listening for microphone input...');
        this.listenLoop();
    }
    stopListening() {
        this.isRunning = false;
        if (this.micInstance) {
            this.micInstance.stop();
        }
        console.log('Real voice input handler stopped.');
    }
    async listenLoop() {
        while (this.isRunning) {
            await this.recordAndTranscribe();
        }
    }
    async recordAndTranscribe() {
        return new Promise((resolve) => {
            // Remove previous audio file if exists
            if (fs_1.default.existsSync(this.audioFilePath)) {
                fs_1.default.unlinkSync(this.audioFilePath);
            }
            // Set up mic instance
            this.micInstance = (0, mic_1.default)({
                rate: '16000',
                channels: '1',
                debug: false,
                exitOnSilence: 6
            });
            const micInputStream = this.micInstance.getAudioStream();
            const outputFileStream = fs_1.default.createWriteStream(this.audioFilePath);
            micInputStream.pipe(outputFileStream);
            // Record for 5 seconds
            this.micInstance.start();
            console.log('Recording audio for 5 seconds...');
            setTimeout(() => {
                if (this.micInstance) {
                    this.micInstance.stop();
                }
            }, 5000);
            micInputStream.on('silence', () => {
                // Optionally, stop on silence
            });
            micInputStream.on('error', (err) => {
                console.error('Mic error:', err);
                resolve();
            });
            micInputStream.on('stopComplete', async () => {
                outputFileStream.end();
                console.log('Audio recording stopped. Sending to GPT-4o...');
                try {
                    const transcript = await this.transcribeAudio(this.audioFilePath);
                    if (transcript && transcript.trim().length > 0) {
                        console.log('Transcription:', transcript);
                        await this.samAssistant.processVoiceInput(transcript);
                    }
                    else {
                        console.log('No speech detected.');
                    }
                }
                catch (err) {
                    console.error('Transcription error:', err);
                }
                resolve();
            });
        });
    }
    async transcribeAudio(audioPath) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in environment');
        }
        // Check if audio file exists and has content
        if (!fs_1.default.existsSync(audioPath)) {
            throw new Error('Audio file does not exist');
        }
        const stats = fs_1.default.statSync(audioPath);
        if (stats.size === 0) {
            console.log('Audio file is empty, skipping transcription');
            return '';
        }
        console.log(`Audio file size: ${stats.size} bytes`);
        // Convert audio to base64 for GPT-4o
        const audioBuffer = fs_1.default.readFileSync(audioPath);
        const base64Audio = audioBuffer.toString('base64');
        try {
            const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Please transcribe this audio. Return only the transcribed text, nothing else.'
                                },
                                {
                                    type: 'input_audio',
                                    input_audio: {
                                        url: `data:audio/wav;base64,${base64Audio}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('GPT-4o API response:', errorText);
                throw new Error(`GPT-4o API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const result = await response.json();
            const text = result.choices[0]?.message?.content || '';
            return text.trim();
        }
        catch (error) {
            console.error('Full error details:', error);
            throw error;
        }
    }
}
exports.RealVoiceInputHandler = RealVoiceInputHandler;
