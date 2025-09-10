import * as fs from 'fs';
import * as path from 'path';

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

export class BookService {
  private downloadDir: string;

  constructor() {
    this.downloadDir = path.join(__dirname, '..', 'downloads');
    this.ensureDownloadDir();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private async fetchWithUserAgent(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        'User-Agent': 'SamGlasses/1.0 (Augmented Reading Assistant)'
      }
    });
  }

  /**
   * Search for books using Gutendex API
   */
  async searchBooks(query: string, language?: string): Promise<BookSearchResponse> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const langParam = language ? `&languages=${encodeURIComponent(language)}` : '';
      const url = `https://gutendex.com/books/?search=${encodedQuery}${langParam}`;
      
      console.log(`Searching books: ${url}`);
      const response = await this.fetchWithUserAgent(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      
      const data = await response.json();
      
      // Normalize the results
      const items: BookResult[] = (data.results || []).map((book: any) => ({
        id: book.id,
        title: book.title,
        authors: (book.authors || []).map((author: any) => author.name),
        languages: book.languages || [],
        subjects: book.subjects || [],
        formats: {
          epub: book.formats?.['application/epub+zip'] || null,
          txt: book.formats?.['text/plain; charset=utf-8'] || 
                book.formats?.['text/plain'] || null
        }
      }));

      return {
        items: items.slice(0, 5), // Limit to top 5 results
        next: data.next || null
      };
    } catch (error) {
      console.error('Error searching books:', error);
      throw new Error(`Failed to search books: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download a book and return its content
   */
  async downloadBook(bookId: number, preferredFormat: 'txt' | 'epub' = 'txt'): Promise<DownloadedBook> {
    try {
      // First get book metadata
      const metaUrl = `https://gutendex.com/books/${bookId}`;
      const metaResponse = await this.fetchWithUserAgent(metaUrl);
      
      if (!metaResponse.ok) {
        throw new Error(`Book not found: ${bookId}`);
      }
      
      const metadata = await metaResponse.json();
      
      // Determine download URL
      const epubUrl = metadata.formats?.['application/epub+zip'];
      const txtUrl = metadata.formats?.['text/plain; charset=utf-8'] || 
                     metadata.formats?.['text/plain'];
      
      let downloadUrl: string;
      let format: 'txt' | 'epub';
      
      if (preferredFormat === 'txt' && txtUrl) {
        downloadUrl = txtUrl;
        format = 'txt';
      } else if (preferredFormat === 'epub' && epubUrl) {
        downloadUrl = epubUrl;
        format = 'epub';
      } else if (txtUrl) {
        downloadUrl = txtUrl;
        format = 'txt';
      } else if (epubUrl) {
        downloadUrl = epubUrl;
        format = 'epub';
      } else {
        throw new Error('No supported format available for this book');
      }
      
      console.log(`Downloading book ${bookId} from: ${downloadUrl}`);
      
      // Download the file
      const downloadResponse = await this.fetchWithUserAgent(downloadUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download book: HTTP ${downloadResponse.status}`);
      }
      
      let content: string;
      if (format === 'txt') {
        content = await downloadResponse.text();
        // Clean up the text content
        content = this.cleanTextContent(content);
      } else {
        // For EPUB, we'll just get the raw content for now
        // In a more advanced implementation, you'd parse the EPUB
        const buffer = await downloadResponse.arrayBuffer();
        content = new TextDecoder('utf-8').decode(buffer);
      }
      
      // Save locally for caching
      const safeTitle = metadata.title.replace(/[^\w\d\-_.]+/g, '_');
      const filename = `${safeTitle}_${bookId}.${format}`;
      const filepath = path.join(this.downloadDir, filename);
      fs.writeFileSync(filepath, content, 'utf-8');
      
      return {
        id: bookId,
        title: metadata.title,
        authors: (metadata.authors || []).map((author: any) => author.name),
        content: content,
        format: format
      };
    } catch (error) {
      console.error(`Error downloading book ${bookId}:`, error);
      throw new Error(`Failed to download book: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up text content from Project Gutenberg
   */
  private cleanTextContent(content: string): string {
    // Remove BOM if present
    content = content.replace(/^\uFEFF/, '');
    
    // Normalize line breaks
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove Project Gutenberg header and footer
    const startPattern = /\*\*\*\s*START OF TH(IS|E) PROJECT GUTENBERG EBOOK.*?\*\*\*/is;
    const endPattern = /\*\*\*\s*END OF TH(IS|E) PROJECT GUTENBERG EBOOK.*?\*\*\*/is;
    
    const startMatch = content.match(startPattern);
    const endMatch = content.match(endPattern);
    
    if (startMatch) {
      content = content.substring(startMatch.index! + startMatch[0].length);
    }
    
    if (endMatch) {
      content = content.substring(0, endMatch.index);
    }
    
    // Remove common Project Gutenberg metadata sections
    const metadataPatterns = [
      /Note:\s*Project Gutenberg.*?(?=\n\n|\n[A-Z])/is,
      /See.*?\.htm.*?(?=\n\n|\n[A-Z])/is,
      /through Internet Archive.*?(?=\n\n|\n[A-Z])/is,
      /\(https?:\/\/.*?\).*?(?=\n\n|\n[A-Z])/is,
      /in italics.*?enclosed.*?(?=\n\n|\n[A-Z])/is,
      /Multiple superscripted.*?(?=\n\n|\n[A-Z])/is,
      /A carat character.*?(?=\n\n|\n[A-Z])/is,
      /Underscores.*?(?=\n\n|\n[A-Z])/is,
      /This eBook is for.*?(?=\n\n|\n[A-Z])/is,
      /Title:\s*.*?\n.*?Author:\s*.*?\n.*?(?=\n\n|\n[A-Z])/is,
      /Release Date:.*?\n.*?Language:.*?\n.*?(?=\n\n|\n[A-Z])/is,
      /Produced by.*?(?=\n\n|\n[A-Z])/is,
      /Updated:.*?(?=\n\n|\n[A-Z])/is
    ];
    
    for (const pattern of metadataPatterns) {
      content = content.replace(pattern, '');
    }
    
    // Remove publication metadata sections more aggressively
    const publicationPatterns = [
      /Images of the original pages.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /By the Author of.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /VOL\.\s*[IVX]+.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /London:\s*Printed.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /^\s*\d{4}\s*\.?\s*$.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/ims,
      /\[Illustration:.*?\].*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /_Invented by.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is,
      /Charlotte Street.*?(?=\n\n|\nChapter|\n[A-Z][a-z]+ \d+)/is
    ];
    
    for (const pattern of publicationPatterns) {
      content = content.replace(pattern, '');
    }
    
    // Try to find the actual start of the story content
    // Look for common story beginnings
    const storyStartPatterns = [
      /Chapter\s+1/i,
      /Chapter\s+I\b/i,
      /CHAPTER\s+1/,
      /CHAPTER\s+I\b/,
      /^It is a truth universally acknowledged/m, // Pride and Prejudice specific
      /^In a hole in the ground/m, // The Hobbit
      /^Call me Ishmael/m, // Moby Dick
      /^It was the best of times/m, // Tale of Two Cities
      /^\s*[A-Z][a-z]+ \d+/m // General chapter pattern
    ];
    
    for (const pattern of storyStartPatterns) {
      const match = content.match(pattern);
      if (match && match.index) {
        content = content.substring(match.index);
        break;
      }
    }
    
    // Remove any remaining lines that look like formatting instructions
    const lines = content.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip lines that are clearly metadata or instructions
      return !(
        trimmed.includes('Project Gutenberg') ||
        trimmed.includes('www.gutenberg') ||
        trimmed.includes('archive.org') ||
        trimmed.includes('_italics_') ||
        trimmed.includes('carat character') ||
        trimmed.includes('superscripted') ||
        trimmed.includes('eBook is for') ||
        trimmed.includes('Printed for') ||
        trimmed.includes('Military Library') ||
        trimmed.includes('Charlotte Street') ||
        trimmed.includes('Illustration:') ||
        trimmed.includes('Invented by') ||
        trimmed.match(/^(Title|Author|Release Date|Language|Produced by):/i) ||
        trimmed.match(/^\s*\d{4}\s*\.?\s*$/) || // Years like "1813"
        trimmed.match(/^\s*\d+\s*$/) || // Page numbers
        trimmed.match(/^VOL\.\s*[IVX]+/i) || // Volume numbers
        trimmed.length < 3 // Very short lines
      );
    });
    
    content = cleanedLines.join('\n');
    
    // Clean up excessive whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();
    
    return content;
  }

  /**
   * Get a cached book if it exists
   */
  getCachedBook(bookId: number): DownloadedBook | null {
    try {
      const files = fs.readdirSync(this.downloadDir);
      const bookFile = files.find(file => file.includes(`_${bookId}.`));
      
      if (bookFile) {
        const filepath = path.join(this.downloadDir, bookFile);
        const content = fs.readFileSync(filepath, 'utf-8');
        const format = bookFile.endsWith('.epub') ? 'epub' : 'txt';
        
        // Extract title from filename
        const title = bookFile.replace(`_${bookId}.${format}`, '').replace(/_/g, ' ');
        
        return {
          id: bookId,
          title: title,
          authors: [], // We don't store authors in the filename
          content: content,
          format: format as 'txt' | 'epub'
        };
      }
    } catch (error) {
      console.error('Error checking cached book:', error);
    }
    
    return null;
  }
}
