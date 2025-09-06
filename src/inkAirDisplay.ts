import { TpaSession } from '@augmentos/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { SamAssistant } from './samAssistant';

// Read the entire text file
const textContent = fs.readFileSync(path.join(__dirname, 'Burning_Chrome.txt'), 'utf-8');

// Create a global instance of SamAssistant
const samAssistant = new SamAssistant();

// Function to create text segments
function createTextSegments(text: string): string[] {
    const segments: string[] = [];
    
    // Add the title and author as the first chunk
    segments.push('Dogfight\nby Michael Swanwick and William Gibson');
    
    // Remove the title and author from the text content for processing
    const lines = text.split('\n');
    const contentStartIndex = lines.findIndex(line => 
        line.trim() !== 'Dogfight' && 
        line.trim() !== 'by Michael Swanwick and William Gibson' &&
        line.trim() !== ''
    );
    
    // Get the content without the title and author
    const contentText = lines.slice(contentStartIndex).join('\n');
    
    const words = contentText.split(/\s+/);
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

// Create the text segments
const textSegments = createTextSegments(textContent);

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
 */
export async function startEReader(session: TpaSession, startFromChunk: number = 0): Promise<void> {
    for (let i = startFromChunk; i < textSegments.length; i++) {
        // Update the current chunk in samAssistant
        samAssistant.setCurrentChunk(i);
        
        // Check if auto-scroll is paused
        if (samAssistant.isAutoScrollPaused()) {
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
        
        // If this isn't the last segment, wait and immediately show the next one
        if (i < textSegments.length - 1) {
            console.log(`Waiting 5 seconds before chunk ${chunkNumber + 1}...`);
            
            // Create a promise that can be interrupted
            const timeoutPromise = new Promise(resolve => {
                const timeout = setTimeout(resolve, 5000);
                samAssistant.setCurrentTimeout(timeout);
            });
            
            await timeoutPromise;
            
            console.log(`Time elapsed, immediately showing chunk ${chunkNumber + 1}`);
        }
    }
    
    if (!samAssistant.isAutoScrollPaused()) {
        console.log('E-reader finished, clearing display');
        // Clear the display when finished
        await session.layouts.showTextWall('');
    }
}

// Export the samAssistant instance
export { samAssistant }; 