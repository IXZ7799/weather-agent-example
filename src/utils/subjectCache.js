// interface SubjectContext {
//   subject: string;
//   relevantContent: string;
//   extractedConcepts: string[];
//   keyTerms: string[];
//   relatedQuestions: string[];
//   timestamp: number;
//   moduleId: string;
// }

// interface ProcessedModuleContext {
//   moduleId: string;
//   subjects: SubjectContext[]; // This would ideally be an array of objects matching the structure
//   lastProcessed: number;
//   totalContent: string;
// }

class SubjectCache {
  constructor() {
    this.cache = new Map(); // private cache: Map<string, ProcessedModuleContext> = new Map();
    this.maxCacheAge = 2 * 60 * 60 * 1000; // 2 hours // private readonly maxCacheAge = 2 * 60 * 60 * 1000; 
    this.maxSubjects = 20; // Max subjects per module // private readonly maxSubjects = 20;
  }

  // Extract subjects and concepts from module content
  extractSubjectsFromContent(content, moduleId) { // : SubjectContext[]
    console.log('Extracting subjects from module content...');
    
    const subjects = []; // : SubjectContext[]
    
    const sections = this.splitIntoSections(content);
    
    sections.forEach((section, index) => {
      const subject = this.identifySubject(section, index);
      const concepts = this.extractConcepts(section);
      const keyTerms = this.extractKeyTerms(section);
      const relatedQuestions = this.generateRelatedQuestions(subject, concepts);
      
      subjects.push({
        subject,
        relevantContent: section,
        extractedConcepts: concepts,
        keyTerms,
        relatedQuestions,
        timestamp: Date.now(),
        moduleId
      });
    });
    
    console.log(`Extracted ${subjects.length} subjects from module content`);
    return subjects.slice(0, this.maxSubjects);
  }

  splitIntoSections(content) { // : string[] // private
    const pageMarkers = content.split(/--- Page \d+ ---/);
    if (pageMarkers.length > 1) {
      return pageMarkers.filter(section => section.trim().length > 100);
    }
    
    const sections = content.split(/\n\n(?=[A-Z].*:|\d+\.|\#)/);
    return sections.filter(section => section.trim().length > 200);
  }

  identifySubject(section, index) { // : string // private
    const lines = section.trim().split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 100) {
      return firstLine.replace(/^(Page \d+|Chapter \d+|\d+\.|\#)+\s*/, '');
    }
    
    const words = section.trim().split(/\s+/).slice(0, 8);
    return words.join(' ') + '...';
  }

  extractConcepts(section) { // : string[] // private
    const concepts = []; // : string[]
    
    const conceptPatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized terms
      /\b\w+(?:ing|tion|sion|ment|ness|ity)\b/g, // Common concept suffixes
      /\b(?:algorithm|method|approach|technique|strategy|framework|model|system)\b/gi
    ];
    
    conceptPatterns.forEach(pattern => {
      const matches = section.match(pattern) || [];
      concepts.push(...matches);
    });
    
    return [...new Set(concepts)]
      .filter(concept => concept.length > 2 && concept.length < 30)
      .slice(0, 15);
  }

  extractKeyTerms(section) { // : string[] // private
    const terms = []; // : string[]
    
    const definitionPatterns = [
      /(\w+)\s+is\s+(?:a|an|the)\s+/gi,
      /(\w+)\s*:\s*/g,
      /\bdefine[sd]?\s+(\w+)/gi
    ];
    
    definitionPatterns.forEach(pattern => {
      const matches = [...section.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[1].length > 2) {
          terms.push(match[1]);
        }
      });
    });
    
    return [...new Set(terms)].slice(0, 10);
  }

  generateRelatedQuestions(subject, concepts) { // : string[] // private
    const questions = []; // : string[]
    
    const questionTemplates = [
      `What are the key principles of ${subject}?`,
      `How does ${subject} work?`,
      `What are the main components of ${subject}?`,
      `Why is ${subject} important?`,
      `What are common applications of ${subject}?`
    ];
    
    concepts.slice(0, 3).forEach(concept => {
      questions.push(`Can you explain ${concept} in relation to ${subject}?`);
      questions.push(`How is ${concept} used in practice?`);
    });
    
    return [...questionTemplates, ...questions].slice(0, 10);
  }

  // Cache processed module context
  cacheModuleContext(moduleId, content) { // : void
    console.log(`Caching context for module ${moduleId}...`);
    
    const subjects = this.extractSubjectsFromContent(content, moduleId);
    
    const processedContext = { // : ProcessedModuleContext
      moduleId,
      subjects,
      lastProcessed: Date.now(),
      totalContent: content
    };
    
    this.cache.set(moduleId, processedContext);
    console.log(`Cached ${subjects.length} subjects for module ${moduleId}`);
  }

  // Find relevant cached context for a question
  findRelevantContext(question, moduleId) { // : SubjectContext | null
    const moduleContext = this.cache.get(moduleId);
    if (!moduleContext || this.isExpired(moduleContext.lastProcessed)) {
      return null;
    }
    
    const normalizedQuestion = question.toLowerCase();
    
    const scoredSubjects = moduleContext.subjects.map(subjectContext => { // Renamed 'subject' to 'subjectContext' to avoid conflict
      let score = 0;
      
      if (normalizedQuestion.includes(subjectContext.subject.toLowerCase())) {
        score += 10;
      }
      
      subjectContext.extractedConcepts.forEach(concept => {
        if (normalizedQuestion.includes(concept.toLowerCase())) {
          score += 5;
        }
      });
      
      subjectContext.keyTerms.forEach(term => {
        if (normalizedQuestion.includes(term.toLowerCase())) {
          score += 3;
        }
      });
      
      subjectContext.relatedQuestions.forEach(relatedQ => {
        const similarity = this.calculateSimilarity(normalizedQuestion, relatedQ.toLowerCase());
        score += similarity * 2;
      });
      
      return { subject: subjectContext, score }; // Return the whole subject context
    });
    
    const bestMatch = scoredSubjects.sort((a, b) => b.score - a.score)[0];
    
    if (bestMatch && bestMatch.score > 5) {
      console.log(`Found relevant cached context: ${bestMatch.subject.subject} (score: ${bestMatch.score})`);
      return bestMatch.subject;
    }
    
    return null;
  }

  calculateSimilarity(str1, str2) { // : number // private
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    // Avoid division by zero if union is empty
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  isExpired(timestamp) { // : boolean // private
    return Date.now() - timestamp > this.maxCacheAge;
  }

  // Get all subjects for a module (for admin/debugging)
  getModuleSubjects(moduleId) { // : string[]
    const moduleContext = this.cache.get(moduleId);
    return moduleContext ? moduleContext.subjects.map(s => s.subject) : [];
  }

  // Clear expired cache entries
  cleanupCache() { // : void
    const now = Date.now();
    for (const [moduleId, context] of this.cache.entries()) {
      if (this.isExpired(context.lastProcessed)) {
        this.cache.delete(moduleId);
        console.log(`Removed expired cache for module ${moduleId}`);
      }
    }
  }

  // Get cache stats
  getCacheStats() { // : { totalModules: number; totalSubjects: number; oldestEntry: number }
    let totalSubjects = 0;
    let oldestEntry = Date.now();
    
    for (const context of this.cache.values()) {
      totalSubjects += context.subjects.length;
      if (context.lastProcessed < oldestEntry) {
        oldestEntry = context.lastProcessed;
      }
    }
    
    return {
      totalModules: this.cache.size,
      totalSubjects,
      oldestEntry: this.cache.size > 0 ? oldestEntry : 0 // Handle case where cache is empty
    };
  }
}

export const subjectCache = new SubjectCache();

// Clean up cache periodically
setInterval(() => {
  subjectCache.cleanupCache();
}, 30 * 60 * 1000); // Every 30 minutes 