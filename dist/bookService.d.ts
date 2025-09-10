export interface BookResult {
    id: number;
    title: string;
    authors: string[];
    languages: string[];
    subjects: string[];
    formats: {
        epub: string | null;
        txt: string | null;
    };
}
export interface BookSearchResponse {
    items: BookResult[];
    next: string | null;
}
export interface DownloadedBook {
    id: number;
    title: string;
    authors: string[];
    content: string;
    format: 'txt' | 'epub';
}
export declare class BookService {
    private downloadDir;
    constructor();
    private ensureDownloadDir;
    private fetchWithUserAgent;
    /**
     * Search for books using Gutendex API
     */
    searchBooks(query: string, language?: string): Promise<BookSearchResponse>;
    /**
     * Download a book and return its content
     */
    downloadBook(bookId: number, preferredFormat?: 'txt' | 'epub'): Promise<DownloadedBook>;
    /**
     * Clean up text content from Project Gutenberg
     */
    private cleanTextContent;
    /**
     * Get a cached book if it exists
     */
    getCachedBook(bookId: number): DownloadedBook | null;
}
//# sourceMappingURL=bookService.d.ts.map