import { TpaSession } from '@augmentos/sdk';
import { SamAssistant } from './samAssistant';
declare const samAssistant: SamAssistant;
/**
 * Displays the "Ink Air" text for 5 seconds
 * @param session The active TPA session
 */
export declare function displayInkAir(session: TpaSession): Promise<void>;
/**
 * Displays the e-reader with text from Burning_Chrome.txt
 * @param session The active TPA session
 */
export declare function startEReader(session: TpaSession, startFromChunk?: number): Promise<void>;
export { samAssistant };
//# sourceMappingURL=inkAirDisplay.d.ts.map