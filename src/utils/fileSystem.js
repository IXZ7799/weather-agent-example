
/**
 * File system utility functions for the InfoSec AI Buddy application
 * These functions are meant to be used in the browser environment
 */

/**
 * Downloads a file to the user's device
 * @param filename The name of the file to download
 * @param content The content of the file
 * @param contentType The MIME type of the file
 */
export function downloadFile(filename, content, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
