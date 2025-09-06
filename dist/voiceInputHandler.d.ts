import { SamAssistant } from './samAssistant';
import { TpaSession } from '@augmentos/sdk';
export declare class VoiceInputHandler {
    private samAssistant;
    private session;
    private isRunning;
    constructor(session: TpaSession, samAssistant: SamAssistant);
    /**
     * Start listening for voice input (simulated for testing)
     */
    startListening(): void;
    /**
     * Stop listening for voice input
     */
    stopListening(): void;
    /**
     * Process voice input (called by external voice recognition system)
     */
    processVoiceInput(audioText: string): Promise<void>;
    /**
     * Simulate voice commands for testing
     */
    private simulateVoiceCommands;
}
//# sourceMappingURL=voiceInputHandler.d.ts.map