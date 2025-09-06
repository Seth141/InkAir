import { TpaSession } from '@augmentos/sdk';
import OpenAI from 'openai';
import { startEReader } from './inkAirDisplay';

export class SamAssistant {
  private isListening: boolean = false;
  private autoScrollPaused: boolean = false;
  private currentTimeout: NodeJS.Timeout | null = null;
  private currentChunk: number = 0;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('Sam Assistant initialized');
  }

  public isAutoScrollPaused(): boolean {
    return this.autoScrollPaused;
  }

  public getCurrentChunk(): number {
    return this.currentChunk;
  }

  public setCurrentChunk(chunk: number): void {
    this.currentChunk = chunk;
  }

  public setCurrentTimeout(timeout: NodeJS.Timeout): void {
    this.currentTimeout = timeout;
  }

  public clearCurrentTimeout(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  public async handleVoiceCommand(session: TpaSession, text: string): Promise<void> {
    const lowerText = text.toLowerCase();
    
    // Enhanced debugging
    console.log('Voice Command Debug:', {
      originalText: text,
      lowerText: lowerText,
      textLength: text.length,
      isListening: this.isListening,
      containsHeySam: lowerText.includes('hey sam') || 
                     lowerText.includes('hey, sam') || 
                     lowerText.includes('hey  sam') ||
                     lowerText.includes('heysan') ||
                     lowerText.includes('hey son'),
      timestamp: new Date().toISOString()
    });

    // Check for wake phrase with more flexible matching
    if (lowerText.includes('hey sam') || 
        lowerText.includes('hey, sam') || 
        lowerText.includes('hey  sam') ||
        lowerText.includes('heysan') ||
        lowerText.includes('hey son')) {
      
      console.log('Wake word detected');
      this.isListening = true;
      await session.layouts.showTextWall('Im Listening...');
      return;
    }

    // Only process commands if we're listening
    if (!this.isListening) {
      console.log('Not listening - ignoring command');
      return;
    }

    console.log('Processing command:', lowerText);

    // Process commands
    if (lowerText.includes('stop') || lowerText.includes('pause')) {
      console.log('Stop/Pause command received');
      this.autoScrollPaused = true;
      this.clearCurrentTimeout();
      this.isListening = false;
      await session.layouts.showTextWall('Reading paused. Say "hey sam, resume" to continue.');
    } else if (lowerText.includes('resume') || lowerText.includes('continue')) {
      console.log('Resume command received');
      this.autoScrollPaused = false;
      this.isListening = false;
      await startEReader(session, this.currentChunk);
    } else if (lowerText.includes('start over') || lowerText.includes('restart')) {
      console.log('Start over command received');
      this.autoScrollPaused = false;
      this.currentChunk = 0;
      this.isListening = false;
      await startEReader(session, 0);
    } else {
      console.log('Command not recognized:', lowerText);
      this.isListening = false;
      await session.layouts.showTextWall('Command not recognized. Available commands: stop, resume, start over');
    }
  }
} 