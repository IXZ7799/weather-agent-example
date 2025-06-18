/**
 * Real Content Validator
 * Validates content to ensure it meets quality standards
 */

export class RealContentValidator {
  constructor() {
    this.minContentLength = 50; // Minimum content length in characters
  }

  /**
   * Validate content for quality and relevance
   * @param {string} content - The content to validate
   * @returns {Object} - Validation results
   */
  validate(content) {
    if (!content || typeof content !== 'string') {
      return {
        valid: false,
        reason: 'Content must be a non-empty string'
      };
    }

    // Check content length
    if (content.length < this.minContentLength) {
      return {
        valid: false,
        reason: `Content is too short (${content.length} chars). Minimum required: ${this.minContentLength} chars.`
      };
    }

    // Check for meaningful content (basic check)
    if (this.isGibberish(content)) {
      return {
        valid: false,
        reason: 'Content appears to be gibberish or non-meaningful text'
      };
    }

    return {
      valid: true,
      metrics: {
        length: content.length,
        wordCount: this.countWords(content)
      }
    };
  }

  /**
   * Count words in content
   * @param {string} content - The content to analyze
   * @returns {number} - Word count
   */
  countWords(content) {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Check if content appears to be gibberish
   * @param {string} content - The content to check
   * @returns {boolean} - True if content appears to be gibberish
   */
  isGibberish(content) {
    // Simple heuristic: check for extremely long words or repetitive patterns
    const words = content.trim().split(/\s+/);
    
    // Check for extremely long words
    const hasExtremelyLongWords = words.some(word => word.length > 30);
    
    // Check for repetitive patterns
    const sampleSize = Math.min(20, words.length);
    const uniqueWords = new Set(words.slice(0, sampleSize)).size;
    const repetitionRatio = uniqueWords / sampleSize;
    
    return hasExtremelyLongWords || (repetitionRatio < 0.3 && words.length > 10);
  }
}
