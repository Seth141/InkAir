import { TpaSession } from '@augmentos/sdk';
import { DownloadedBook } from './bookService';
export declare class SamAssistant {
    private isListening;
    private autoScrollPaused;
    private currentTimeout;
    private currentChunk;
    private openai;
    private bookService;
    private searchResults;
    private currentBook;
    constructor();
    isAutoScrollPaused(): boolean;
    getCurrentChunk(): number;
    setCurrentChunk(chunk: number): void;
    setCurrentTimeout(timeout: NodeJS.Timeout): void;
    clearCurrentTimeout(): void;
    getCurrentBook(): DownloadedBook | null;
    private searchForBooks;
    private downloadBook;
    handleVoiceCommand(session: TpaSession, text: string): Promise<void>;
}
//# sourceMappingURL=samAssistant.d.ts.map