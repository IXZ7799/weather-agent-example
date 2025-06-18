
import * as Tesseract from 'https://esm.sh/tesseract.js@5.0.5';
import pdfjsLib from 'https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.js';
import { createCanvas } from 'https://esm.sh/canvas@2.11.2';

// CORS headers - Comprehensive CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

// Helper to convert ArrayBuffer to Buffer, needed for canvas
function arrayBufferToBuffer(ab) {
  const buffer = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

export default async (req) => {
  // Handle OPTIONS preflight request FIRST - outside try/catch
  if (req.method === 'OPTIONS') {
    console.log('[ocr-pdf-pages] Handling OPTIONS preflight request');
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Proceed with POST request handling
    if (req.method === 'POST') {
      console.log('[ocr-pdf-pages] Handling POST request');
      
      const body = await req.json();
      const { pdfDataB64, lang = 'eng' } = body;

      if (!pdfDataB64) {
        console.log('[ocr-pdf-pages] Missing pdfDataB64 parameter');
        return new Response(JSON.stringify({ error: 'Missing pdfDataB64 parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`[ocr-pdf-pages] Starting OCR processing, language: ${lang}`);

      const pdfData = Buffer.from(pdfDataB64, 'base64');
      
      // Initialize Tesseract with reduced timeout
      const worker = await Tesseract.TesseractWorker.create({ 
        logger: m => console.log(`[Tesseract] ${m.status} (${(m.progress * 100).toFixed(1)}%)`),
      });
      
      console.log('[ocr-pdf-pages] Loading Tesseract language...');
      await worker.loadLanguage(lang);
      await worker.initialize(lang);
      console.log('[ocr-pdf-pages] Tesseract worker initialized');

      console.log('[ocr-pdf-pages] Loading PDF document...');
      const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
      console.log(`[ocr-pdf-pages] PDF loaded with ${pdfDocument.numPages} pages`);

      let fullOcrText = '';
      // Reduce max pages for faster processing
      const maxPagesToOcr = Math.min(pdfDocument.numPages, 5); 

      for (let i = 1; i <= maxPagesToOcr; i++) {
        console.log(`[ocr-pdf-pages] Processing page ${i}/${maxPagesToOcr}...`);
        
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale for speed

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const imageBuffer = canvas.toBuffer('image/png'); 

        console.log(`[ocr-pdf-pages] Performing OCR on page ${i}...`);
        const { data: { text: ocrText } } = await worker.recognize(imageBuffer);
        
        if (ocrText && ocrText.trim().length > 0) {
          fullOcrText += ocrText.trim() + '\n\n';
          console.log(`[ocr-pdf-pages] Page ${i} OCR successful: ${ocrText.trim().length} chars`);
        } else {
          console.log(`[ocr-pdf-pages] Page ${i} OCR yielded no text`);
        }
        
        page.cleanup(); 
      }

      await worker.terminate();
      console.log(`[ocr-pdf-pages] OCR completed. Total text: ${fullOcrText.length} chars`);

      return new Response(JSON.stringify({ ocrText: fullOcrText.trim() }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      console.log(`[ocr-pdf-pages] Method not allowed: ${req.method}`);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[ocr-pdf-pages] Error:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message || 'OCR processing failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
