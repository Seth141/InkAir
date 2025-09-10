"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const sdk_1 = require("@augmentos/sdk");
const inkAirDisplay_1 = require("./inkAirDisplay");
const samAssistant_1 = require("./samAssistant");
// Load environment variables from .env file
(0, dotenv_1.config)();
// Load configuration from environment variables
const PACKAGE_NAME = process.env.PACKAGE_NAME || "com.example.myfirstaugmentosapp";
const BASE_PORT = 4000; // Using a different port to avoid conflicts
const AUGMENTOS_API_KEY = process.env.AUGMENTOS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Validate required environment variables
if (!AUGMENTOS_API_KEY) {
    console.error("AUGMENTOS_API_KEY environment variable is required");
    process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    process.exit(1);
}
/**
 * MyAugmentOSApp - A simple AugmentOS application that displays animations and text
 */
class MyAugmentOSApp extends sdk_1.TpaServer {
    constructor() {
        super(...arguments);
        this.hasRunSequence = false;
        this.samAssistant = new samAssistant_1.SamAssistant();
    }
    getBouncingFrame(time) {
        const width = 15; // Increased total width
        const period = 2000; // Time for one complete cycle (ms)
        const cycleTime = time % period;
        const halfPeriod = period / 2;
        // Calculate positions with floating point for smoother movement
        let pos1, pos2;
        const centerPoint = width / 2;
        if (cycleTime < halfPeriod) {
            // Moving towards center with easing
            const progress = cycleTime / halfPeriod;
            // Use sine easing for smoother acceleration/deceleration
            const easedProgress = Math.sin(progress * Math.PI / 2);
            pos1 = easedProgress * centerPoint;
            pos2 = width - 1 - pos1;
        }
        else {
            // Moving away from center with easing
            const progress = (cycleTime - halfPeriod) / halfPeriod;
            // Use sine easing for smoother acceleration/deceleration
            const easedProgress = Math.sin(progress * Math.PI / 2);
            pos1 = centerPoint - (easedProgress * centerPoint);
            pos2 = width - 1 - pos1;
        }
        // Build the frame with sub-pixel rendering simulation
        let frame = '';
        for (let i = 0; i < width; i++) {
            // Check if we're within 0.5 units of either position for smoother appearance
            const nearPos1 = Math.abs(i - pos1) < 0.5;
            const nearPos2 = Math.abs(i - pos2) < 0.5;
            frame += (nearPos1 || nearPos2) ? '●' : ' ';
        }
        return frame;
    }
    async animateBounce(session) {
        const cycleLength = 2000; // 2 seconds per cycle
        const numCycles = 4; // Run for exactly 4 cycles
        const animationDuration = cycleLength * numCycles; // 8 seconds total
        const frameInterval = 16; // ~60 FPS for much smoother animation
        const startTime = Date.now();
        while (Date.now() - startTime < animationDuration) {
            const elapsed = Date.now() - startTime;
            const frame = this.getBouncingFrame(elapsed);
            // Display the same animation on both rows
            await session.layouts.showTextWall(`${frame}\n${frame}`);
            await new Promise(resolve => setTimeout(resolve, frameInterval));
        }
        // Don't clear the display - let the next function take over immediately
    }
    async onSession(session, sessionId, userId) {
        try {
            console.log('\n=== Session Started ===');
            console.log(`Session ID: ${sessionId}`);
            console.log(`User ID: ${userId}`);
            console.log('======================\n');
            // Set up voice command handling with enhanced debugging
            console.log('\n=== Setting up Voice Transcription ===');
            console.log('Initializing transcription handler...');
            try {
                // Set up transcription event handler
                session.events.onTranscription(async (data) => {
                    console.log('\n=== Transcription Event Received ===');
                    console.log('Raw transcription data:', data);
                    if (data.text) {
                        console.log('Transcribed text:', data.text);
                        console.log('Is final:', data.isFinal);
                        if (data.isFinal) {
                            console.log('Processing final transcription');
                            try {
                                await this.samAssistant.handleVoiceCommand(session, data.text);
                                console.log('Voice command processed successfully');
                            }
                            catch (error) {
                                console.error('Error processing voice command:', error);
                            }
                        }
                    }
                    else {
                        console.log('No text in transcription data');
                    }
                });
                console.log('Transcription handler setup complete');
                console.log('Voice commands are now active');
                console.log('Say "hey sam" to activate the assistant');
                console.log('=====================================\n');
                // Only run the sequence if it hasn't been run before
                if (!this.hasRunSequence) {
                    this.hasRunSequence = true;
                    // Show bouncing animation for 4 cycles (8 seconds)
                    console.log('Starting bouncing animation for 4 cycles (8 seconds)...');
                    await this.animateBounce(session);
                    console.log('Bounce animation complete');
                    // Display "Ink Air" for 5 seconds
                    console.log('Displaying Ink Air text...');
                    await (0, inkAirDisplay_1.displayInkAir)(session);
                    console.log('Ink Air display completed');
                    // Display prompt instead of auto-starting e-reader
                    console.log('Displaying reading prompt...');
                    await session.layouts.showTextWall('What do you want to read?');
                    console.log('Reading prompt displayed');
                    // After 3 seconds, display step-1 hint to guide the user
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await session.layouts.showTextWall('Hint: say something like "hey sam find pride and prejudice"');
                }
                // Set up error handling with more detail
                session.events.onError((error) => {
                    console.error('Session error:', {
                        error: error,
                        sessionId: sessionId,
                        userId: userId,
                        timestamp: new Date().toISOString()
                    });
                });
                session.events.onDisconnected(() => {
                    console.log(`Session ${sessionId} disconnected at ${new Date().toISOString()}`);
                    // Clean up any timeouts when disconnected
                    this.samAssistant.clearCurrentTimeout();
                });
                // Keep the session alive but don't do anything else
                await new Promise(() => { }); // This keeps the session open without repeating animations
            }
            catch (error) {
                console.error('Failed to setup transcription handler:', error);
                throw error;
            }
        }
        catch (error) {
            console.error('Session error:', error);
            throw error;
        }
    }
}
// Create and start the AugmentOS app server
const server = new MyAugmentOSApp({
    packageName: PACKAGE_NAME,
    apiKey: AUGMENTOS_API_KEY,
    port: BASE_PORT
});
// Start the AugmentOS server
server.start().then(() => {
    console.log(`\n=== Server Started ===`);
    console.log(`AugmentOS server running on port ${BASE_PORT}`);
    console.log(`Package Name: ${PACKAGE_NAME}`);
    console.log(`API Key: Set`);
    console.log(`Voice Transcription: Enabled`);
    console.log('===================\n');
}).catch(err => {
    console.error('\n=== Server Error ===');
    console.error("Failed to start server:", err);
    console.error('==================\n');
    process.exit(1);
});
