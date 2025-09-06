import { TpaSession } from '@augmentos/sdk';
export declare class SamAssistant {
    private isListening;
    private autoScrollPaused;
    private currentTimeout;
    private currentChunk;
    private openai;
    constructor();
    isAutoScrollPaused(): boolean;
    getCurrentChunk(): number;
    setCurrentChunk(chunk: number): void;
    setCurrentTimeout(timeout: NodeJS.Timeout): void;
    clearCurrentTimeout(): void;
    handleVoiceCommand(session: TpaSession, text: string): Promise<void>;
}
//# sourceMappingURL=samAssistant.d.ts.map