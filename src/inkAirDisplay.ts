import { TpaSession } from '@augmentos/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Read the default text file (accounting for src vs dist directory structure)
const textFilePath = fs.existsSync(path.join(__dirname, 'Burning_Chrome.txt')) 
    ? path.join(__dirname, 'Burning_Chrome.txt')
    : path.join(__dirname, '..', 'src', 'Burning_Chrome.txt');
const defaultTextContent = fs.readFileSync(textFilePath, 'utf-8');

// Current content being displayed (can be default or loaded book)
let currentTextContent = defaultTextContent;

// Function to create text segments
function createTextSegments(text: string, isCustomBook: boolean = false): string[] {
    const segments: string[] = [];
    
    if (!isCustomBook) {
        // Add the title and author as the first chunk for default content
        segments.push('Dogfight\nby Michael Swanwick and William Gibson');
        
        // Remove the title and author from the text content for processing
        const lines = text.split('\n');
        const contentStartIndex = lines.findIndex(line => 
            line.trim() !== 'Dogfight' && 
            line.trim() !== 'by Michael Swanwick and William Gibson' &&
            line.trim() !== ''
        );
        
        // Get the content without the title and author
        text = lines.slice(contentStartIndex).join('\n');
    }
    
    // For custom books, we'll extract title from the first few lines if possible
    if (isCustomBook) {
        const lines = text.split('\n');
        let titleFound = false;
        let titleLines = [];
        
        // Look for a title in the first 10 lines
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.length > 0 && line.length < 100 && !titleFound) {
                titleLines.push(line);
                if (titleLines.length >= 2 || line.length > 20) {
                    titleFound = true;
                    break;
                }
            }
        }
        
        if (titleLines.length > 0) {
            segments.push(titleLines.join('\n'));
            // Remove title lines from content
            const contentStartIndex = lines.findIndex((line, index) => 
                index > titleLines.length && line.trim().length > 20
            );
            if (contentStartIndex > 0) {
                text = lines.slice(contentStartIndex).join('\n');
            }
        }
    }
    
    const words = text.split(/\s+/);
    let currentSegment: string[] = [];
    let currentLine: string[] = [];

    for (const word of words) {
        // Skip empty words
        if (!word.trim()) continue;

        // If adding this word would exceed 5 words in the current line
        if (currentLine.length === 5) {
            // Add the current line to the segment
            currentSegment.push(currentLine.join(' '));
            currentLine = [word];

            // If we've completed 3 lines
            if (currentSegment.length === 3) {
                // Add the segment to our collection and start a new one
                segments.push(currentSegment.join('\n'));
                currentSegment = [];
            }
        } else {
            // Add word to current line
            currentLine.push(word);
        }

        // If this is the last word in the line (based on punctuation)
        if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?') || word.endsWith(':')) {
            // Add the current line to the segment
            currentSegment.push(currentLine.join(' '));
            currentLine = [];

            // If we've completed 3 lines or are at the end of a sentence
            if (currentSegment.length === 3) {
                // Add the segment to our collection and start a new one
                segments.push(currentSegment.join('\n'));
                currentSegment = [];
            }
        }
    }

    // Handle any remaining text
    if (currentLine.length > 0) {
        currentSegment.push(currentLine.join(' '));
    }
    if (currentSegment.length > 0) {
        segments.push(currentSegment.join('\n'));
    }

    return segments;
}

// Create the text segments (initially for default content)
let textSegments = createTextSegments(currentTextContent);

/**
 * Load new book content into the e-reader
 * @param bookContent The text content of the book
 */
export function loadBookContent(bookContent: string): void {
    console.log('Loading new book content into e-reader');
    currentTextContent = bookContent;
    textSegments = createTextSegments(currentTextContent, true);
    console.log(`Book loaded with ${textSegments.length} segments`);
}

/**
 * Displays the "Ink Air" text for 5 seconds
 * @param session The active TPA session
 */
export async function displayInkAir(session: TpaSession): Promise<void> {
    // Display "Ink Air" on a single line
    await session.layouts.showTextWall('   Ink Air   ');
    
    // Wait for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Don't clear the display here - let the e-reader take over immediately
}

/**
 * Displays the e-reader with text from Burning_Chrome.txt
 * @param session The active TPA session
 * @param startFromChunk The chunk index to start from
 * @param samAssistant The SamAssistant instance for controlling the reading
 */
export async function startEReader(session: TpaSession, startFromChunk: number = 0, samAssistant?: any): Promise<void> {
    if (samAssistant) {
        samAssistant.setReadingActive(true);
    }
    for (let i = startFromChunk; i < textSegments.length; i++) {
        // Update the current chunk in samAssistant if available
        if (samAssistant) {
            samAssistant.setCurrentChunk(i);
        }
        
        // Check if auto-scroll is paused
        if (samAssistant && samAssistant.isAutoScrollPaused()) {
            break;
        }

        const segment = textSegments[i];
        const chunkNumber = i + 1;
        const totalChunks = textSegments.length;
        
        console.log(`Displaying chunk ${chunkNumber}/${totalChunks}: "${segment.substring(0, 50)}..."`);
        
        // Create display text with page number
        const displayText = `Page [${chunkNumber}/${totalChunks}]\n\n${segment}`;
        
        // Display current segment of text with chunk number
        await session.layouts.showTextWall(displayText);
        
        // If this isn't the last segment, wait (interruptible) and then show the next one
        if (i < textSegments.length - 1) {
            console.log(`Waiting 5 seconds before chunk ${chunkNumber + 1}...`);

            // Implement an interruptible wait that periodically checks pause state
            const totalWaitMs = 5000;
            const tickMs = 100;
            let waitedMs = 0;

            // Keep a reference to the timeout so callers can still clear it if they want
            let activeTimeout: NodeJS.Timeout | null = null;
            try {
                while (waitedMs < totalWaitMs) {
                    if (samAssistant && samAssistant.isAutoScrollPaused()) {
                        console.log('Reading paused during wait; stopping e-reader loop');
                        return;
                    }
                    await new Promise<void>(resolve => {
                        activeTimeout = setTimeout(resolve, tickMs);
                        if (samAssistant) {
                            samAssistant.setCurrentTimeout(activeTimeout);
                            samAssistant.registerWaitInterruptResolver(() => {
                                if (activeTimeout) {
                                    clearTimeout(activeTimeout);
                                    activeTimeout = null;
                                }
                                resolve();
                            });
                        }
                    });
                    waitedMs += tickMs;
                }

                console.log(`Time elapsed, immediately showing chunk ${chunkNumber + 1}`);
            } catch (error) {
                console.log(`Reading interrupted: ${error}`);
                break;
            } finally {
                if (activeTimeout) {
                    clearTimeout(activeTimeout);
                }
                if (samAssistant) {
                    // Clear stored timeout and resolver
                    samAssistant.clearCurrentTimeout();
                    samAssistant.clearWaitInterruptResolver();
                }
            }
        }
    }
    
    if (!samAssistant || !samAssistant.isAutoScrollPaused()) {
        console.log('E-reader finished, clearing display');
        // Clear the display when finished
        await session.layouts.showTextWall('');
    }
    if (samAssistant) {
        samAssistant.setReadingActive(false);
    }
}

 