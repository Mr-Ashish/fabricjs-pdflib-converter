/**
 * PDF.js Test Setup
 * 
 * This file sets up PDF.js for testing. It's imported by PDF.js-based tests.
 */

// Use pdfjs-dist v3 with Node.js compatibility
import * as pdfjs from 'pdfjs-dist';

// Disable worker for Node.js testing
// @ts-expect-error - pdfjs allows false to disable worker
pdfjs.GlobalWorkerOptions.workerSrc = false;

// Export configured pdfjs for tests
export { pdfjs };
