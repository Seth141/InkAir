"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceInputHandler = void 0;
class VoiceInputHandler {
    constructor(session, samAssistant) {
        this.isRunning = false;
        this.session = session;
        this.samAssistant = samAssistant;
    }
    /**
     * Start listening for voice input (simulated for testing)
     */
    startListening() {
        this.isRunning = true;
        console.log("Voice input handler started. Simulating voice commands...");
        // For testing purposes, we'll simulate voice commands
        // In a real implementation, this would connect to a speech-to-text service
        this.simulateVoiceCommands();
    }
    /**
     * Stop listening for voice input
     */
    stopListening() {
        this.isRunning = false;
        console.log("Voice input handler stopped");
    }
    /**
     * Process voice input (called by external voice recognition system)
     */
    async processVoiceInput(audioText) {
        if (!this.isRunning)
            return;
        console.log(`Voice input received: "${audioText}"`);
        await this.samAssistant.processVoiceInput(audioText);
    }
    /**
     * Simulate voice commands for testing
     */
    async simulateVoiceCommands() {
        // Simulate voice commands after a delay
        setTimeout(async () => {
            if (!this.isRunning)
                return;
            console.log("Simulating: 'hey sam'");
            await this.processVoiceInput("hey sam");
            // Wait a bit, then simulate a pause command
            setTimeout(async () => {
                if (!this.isRunning)
                    return;
                console.log("Simulating: 'pause'");
                await this.processVoiceInput("pause");
                // Wait a bit, then simulate resume
                setTimeout(async () => {
                    if (!this.isRunning)
                        return;
                    console.log("Simulating: 'hey sam'");
                    await this.processVoiceInput("hey sam");
                    setTimeout(async () => {
                        if (!this.isRunning)
                            return;
                        console.log("Simulating: 'resume'");
                        await this.processVoiceInput("resume");
                    }, 2000);
                }, 3000);
            }, 2000);
        }, 10000); // Start simulation after 10 seconds
    }
}
exports.VoiceInputHandler = VoiceInputHandler;
