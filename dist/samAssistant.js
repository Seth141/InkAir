"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SamAssistant = void 0;
const openai_1 = __importDefault(require("openai"));
const inkAirDisplay_1 = require("./inkAirDisplay");
const bookService_1 = require("./bookService");
class SamAssistant {
    constructor() {
        this.isListening = false;
        this.autoScrollPaused = false;
        this.currentTimeout = null;
        this.currentChunk = 0;
        this.searchResults = [];
        this.currentBook = null;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.bookService = new bookService_1.BookService();
        console.log('Sam Assistant initialized with book service');
    }
    isAutoScrollPaused() {
        return this.autoScrollPaused;
    }
    getCurrentChunk() {
        return this.currentChunk;
    }
    setCurrentChunk(chunk) {
        this.currentChunk = chunk;
    }
    setCurrentTimeout(timeout) {
        this.currentTimeout = timeout;
    }
    clearCurrentTimeout() {
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
    }
    getCurrentBook() {
        return this.currentBook;
    }
    async searchForBooks(session, query) {
        try {
            await session.layouts.showTextWall('Searching for books...');
            const searchResults = await this.bookService.searchBooks(query, 'en');
            this.searchResults = searchResults.items;
            if (this.searchResults.length === 0) {
                await session.layouts.showTextWall(`No books found for "${query}". Try a different search.`);
                return;
            }
            // Filter results to only show books with text format
            const textAvailableResults = this.searchResults.filter(book => book.formats.txt !== null);
            if (textAvailableResults.length === 0) {
                await session.layouts.showTextWall(`Found ${this.searchResults.length} books for "${query}", but none have readable text format. Try a different search.`);
                return;
            }
            // Update search results to only include text-available books
            this.searchResults = textAvailableResults;
            // Show the top 3 results
            let resultText = `Found ${this.searchResults.length} books:\n\n`;
            for (let i = 0; i < Math.min(3, this.searchResults.length); i++) {
                const book = this.searchResults[i];
                const authors = book.authors.length > 0 ? book.authors.join(', ') : 'Unknown Author';
                resultText += `${i + 1}. "${book.title}" by ${authors}\n`;
            }
            // Append step-2 hint
            resultText += '\nHint: say something like "hey sam get book 1" to download the first book.';
            await session.layouts.showTextWall(resultText);
        }
        catch (error) {
            console.error('Error searching books:', error);
            await session.layouts.showTextWall('Sorry, I had trouble searching for books. Please try again.');
        }
    }
    async downloadBook(session, bookIndex) {
        try {
            if (bookIndex < 1 || bookIndex > this.searchResults.length) {
                await session.layouts.showTextWall('Invalid book number. Please choose from the search results.');
                return;
            }
            const selectedBook = this.searchResults[bookIndex - 1];
            // Double-check that this book has text format available
            if (!selectedBook.formats.txt) {
                await session.layouts.showTextWall(`"${selectedBook.title}" is not available in readable text format. Please choose a different book.`);
                return;
            }
            await session.layouts.showTextWall(`Downloading "${selectedBook.title}"...`);
            // Check if we have it cached first
            let book = this.bookService.getCachedBook(selectedBook.id);
            if (!book) {
                // Download it - force text format
                book = await this.bookService.downloadBook(selectedBook.id, 'txt');
            }
            // Verify the downloaded content is actually text
            if (book.format !== 'txt') {
                await session.layouts.showTextWall(`"${selectedBook.title}" could not be downloaded in text format. Please try a different book.`);
                return;
            }
            this.currentBook = book;
            // Load the book content into the e-reader
            await (0, inkAirDisplay_1.loadBookContent)(book.content);
            await session.layouts.showTextWall(`"${book.title}" is ready!`);
            // Short delay, then show step-3 hint
            await new Promise(resolve => setTimeout(resolve, 2000));
            await session.layouts.showTextWall('Hint: say something like "hey sam, start reading"');
        }
        catch (error) {
            console.error('Error downloading book:', error);
            await session.layouts.showTextWall('Sorry, I had trouble downloading that book. Please try again.');
        }
    }
    async handleVoiceCommand(session, text) {
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
            // Check if there's a command after the wake word in the same phrase
            const hasCommandAfterWake = lowerText.includes('find book') ||
                lowerText.includes('search book') ||
                lowerText.includes('look for') ||
                lowerText.includes('get book') ||
                lowerText.includes('start reading') ||
                lowerText.includes('stop') ||
                lowerText.includes('pause') ||
                lowerText.includes('resume') ||
                lowerText.includes('start over') ||
                (lowerText.includes('find ') && !lowerText.includes('find me')) ||
                (lowerText.includes('search ') && !lowerText.includes('search me'));
            if (hasCommandAfterWake) {
                console.log('Command detected in same phrase as wake word, processing immediately');
                // Continue to process the command below instead of returning
            }
            else {
                await session.layouts.showTextWall('Im Listening...');
                return;
            }
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
        }
        else if (lowerText.includes('resume') || lowerText.includes('continue')) {
            console.log('Resume command received');
            this.autoScrollPaused = false;
            this.isListening = false;
            await (0, inkAirDisplay_1.startEReader)(session, this.currentChunk, this);
        }
        else if (lowerText.includes('start over') || lowerText.includes('restart')) {
            console.log('Start over command received');
            this.autoScrollPaused = false;
            this.currentChunk = 0;
            this.isListening = false;
            await (0, inkAirDisplay_1.startEReader)(session, 0, this);
        }
        else if (lowerText.includes('start reading') || lowerText.includes('begin reading') || lowerText.includes('read')) {
            console.log('Start reading command received');
            this.autoScrollPaused = false;
            this.currentChunk = 0;
            this.isListening = false;
            await (0, inkAirDisplay_1.startEReader)(session, 0, this);
        }
        else if (lowerText.includes('find book') || lowerText.includes('search book') || lowerText.includes('look for') ||
            (lowerText.includes('find ') && !lowerText.includes('find me')) ||
            (lowerText.includes('search ') && !lowerText.includes('search me'))) {
            console.log('Book search command received');
            this.isListening = false;
            // Extract search query - first remove wake words, then remove command words
            let query = lowerText.replace(/hey sam,?\s*|hey, sam,?\s*|hey\s+sam,?\s*|heysan,?\s*|hey son,?\s*/gi, '').trim();
            query = query.replace(/find book\s*|search book\s*|look for\s*|find\s+|search\s+/gi, '').trim();
            // Clean up punctuation that might interfere with search
            query = query.replace(/[.,!?;:'"]/g, '').trim();
            if (query.length < 2) {
                await session.layouts.showTextWall('Please tell me what book to search for. For example: "find pride and prejudice" or "search sherlock holmes"');
                return;
            }
            console.log(`Extracted search query: "${query}"`);
            await this.searchForBooks(session, query);
        }
        else if (lowerText.includes('get book')) {
            console.log('Book download command received');
            this.isListening = false;
            // First try to match digits
            let match = lowerText.match(/get book (\d+)/);
            let bookIndex = 0;
            if (match) {
                bookIndex = parseInt(match[1]);
            }
            else {
                // Try to match number words
                const numberWords = {
                    'one': 1, 'first': 1,
                    'two': 2, 'second': 2,
                    'three': 3, 'third': 3,
                    'four': 4, 'fourth': 4,
                    'five': 5, 'fifth': 5
                };
                for (const [word, num] of Object.entries(numberWords)) {
                    if (lowerText.includes(`get book ${word}`)) {
                        bookIndex = num;
                        break;
                    }
                }
            }
            if (bookIndex === 0) {
                await session.layouts.showTextWall('Please specify which book number. Say "get book 1", "get book 2", etc.');
                return;
            }
            console.log(`Attempting to download book index: ${bookIndex}`);
            console.log(`Available search results: ${this.searchResults.length}`);
            if (this.searchResults.length === 0) {
                await session.layouts.showTextWall('No search results available. Please search for books first using "find [title]" or "search [author]"');
                return;
            }
            await this.downloadBook(session, bookIndex);
        }
        else {
            console.log('Command not recognized:', lowerText);
            this.isListening = false;
            // Show precise hint phrases
            await session.layouts.showTextWall('Hints:\n' +
                '1) "hey sam find pride and prejudice"\n' +
                '2) "hey sam get book 1"\n' +
                '3) "hey sam, start reading"');
        }
    }
}
exports.SamAssistant = SamAssistant;
