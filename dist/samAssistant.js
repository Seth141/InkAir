"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamAssistant = void 0;
const openai_1 = __importDefault(require("openai"));
const inkAirDisplay_1 = require("./inkAirDisplay");
class SamAssistant {
    constructor() {
        this.isListening = false;
        this.autoScrollPaused = false;
        this.currentTimeout = null;
        this.currentChunk = 0;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('Sam Assistant initialized');
    }
    isAutoScrollPaused() {
        return this.autoScrollPaused;
    }
    getCurrentChunk() {
        return this.currentChunk;
    }
    setCurrentChunk(chunk) {
        this.currentChunk = chunk;
    }
    setCurrentTimeout(timeout) {
        this.currentTimeout = timeout;
    }
    clearCurrentTimeout() {
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
    }
    async handleVoiceCommand(session, text) {
        const lowerText = text.toLowerCase();
        // Enhanced debugging
        console.log('Voice Command Debug:', {
            originalText: text,
            lowerText: lowerText,
            textLength: text.length,
            isListening: this.isListening,
            containsHeySam: lowerText.includes('hey sam') ||
                lowerText.includes('hey, sam') ||
                lowerText.includes('hey  sam') ||
                lowerText.includes('heysan') ||
                lowerText.includes('hey son'),
            timestamp: new Date().toISOString()
        });
        // Check for wake phrase with more flexible matching
        if (lowerText.includes('hey sam') ||
            lowerText.includes('hey, sam') ||
            lowerText.includes('hey  sam') ||
            lowerText.includes('heysan') ||
            lowerText.includes('hey son')) {
            console.log('Wake word detected');
            this.isListening = true;
            await session.layouts.showTextWall('Im Listening...');
            return;
        }
        // Only process commands if we're listening
        if (!this.isListening) {
            console.log('Not listening - ignoring command');
            return;
        }
        console.log('Processing command:', lowerText);
        // Process commands
        if (lowerText.includes('stop') || lowerText.includes('pause')) {
            console.log('Stop/Pause command received');
            this.autoScrollPaused = true;
            this.clearCurrentTimeout();
            this.isListening = false;
            await session.layouts.showTextWall('Reading paused. Say "hey sam, resume" to continue.');
        }
        else if (lowerText.includes('resume') || lowerText.includes('continue')) {
            console.log('Resume command received');
            this.autoScrollPaused = false;
            this.isListening = false;
            await (0, inkAirDisplay_1.startEReader)(session, this.currentChunk);
        }
        else if (lowerText.includes('start over') || lowerText.includes('restart')) {
            console.log('Start over command received');
            this.autoScrollPaused = false;
            this.currentChunk = 0;
            this.isListening = false;
            await (0, inkAirDisplay_1.startEReader)(session, 0);
        }
        else {
            console.log('Command not recognized:', lowerText);
            this.isListening = false;
            await session.layouts.showTextWall('Command not recognized. Available commands: stop, resume, start over');
        }
    }
}
exports.SamAssistant = SamAssistant;
