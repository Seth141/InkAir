import { TpaSession } from '@augmentos/sdk';
/**
 * Load new book content into the e-reader
 * @param bookContent The text content of the book
 */
export declare function loadBookContent(bookContent: string): void;
/**
 * Displays the "Ink Air" text for 5 seconds
 * @param session The active TPA session
 */
export declare function displayInkAir(session: TpaSession): Promise<void>;
/**
 * Displays the e-reader with text from Burning_Chrome.txt
 * @param session The active TPA session
 * @param startFromChunk The chunk index to start from
 * @param samAssistant The SamAssistant instance for controlling the reading
 */
export declare function startEReader(session: TpaSession, startFromChunk?: number, samAssistant?: any): Promise<void>;
//# sourceMappingURL=inkAirDisplay.d.ts.map