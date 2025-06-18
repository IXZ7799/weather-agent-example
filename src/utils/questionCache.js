
class QuestionCache {
  constructor() {
    this.cache = [];
    this.maxCacheSize = 200;
    this.cacheExpirationMs = 24 * 60 * 60 * 1000; // 24 hours
    this.cachingEnabled = false; // Caching feature disabled
  }

  normalizeQuestion(question) {
    return question
      .toLowerCase()
      .replace(/[?!.,;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  calculateSimilarity(q1, q2) {
    const normalized1 = this.normalizeQuestion(q1);
    const normalized2 = this.normalizeQuestion(q2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  findSimilarResponse(question, moduleId) {
    // Caching feature disabled
    console.log('Cache lookup requested but caching is disabled');
    return null;
  }

  cacheResponse(question, response, conversationId, moduleId) {
    // Caching feature disabled
    console.log('Caching disabled - not storing response');
    return;
  }

  processModuleForCaching(moduleId, content) {
    // Caching feature disabled
    return;
  }

  clearCache() {
    this.cache = [];
    console.log('Question cache cleared - cache size:', this.cache.length);
  }

  getCacheStats() {
    return {
      questionCache: {
        size: this.cache.length,
        enabled: this.cachingEnabled,
        oldestEntry: this.cache.length > 0 ? Math.min(...this.cache.map(c => c.timestamp)) : 0
      }
    };
  }

  enableCaching() {
    // Caching feature disabled
    this.cachingEnabled = false;
    console.log('Caching feature has been disabled');
  }

  isCachingEnabled() {
    return this.cachingEnabled;
  }
}

export const questionCache = new QuestionCache();
