import { SamAssistant } from './samAssistant';
import { TpaSession } from '@augmentos/sdk';
export declare class RealVoiceInputHandler {
    private samAssistant;
    private session;
    private isRunning;
    private micInstance;
    private audioFilePath;
    constructor(session: TpaSession, samAssistant: SamAssistant);
    startListening(): void;
    stopListening(): void;
    private listenLoop;
    private recordAndTranscribe;
    private transcribeAudio;
}
//# sourceMappingURL=realVoiceInputHandler.d.ts.map