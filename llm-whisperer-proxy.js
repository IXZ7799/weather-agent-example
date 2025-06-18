/**
 * LLM Whisperer API Proxy Server
 * This server proxies requests to the LLM Whisperer API to avoid CORS issues
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;
const LLM_WHISPERER_API_URL = 'https://llmwhisperer-api.unstract.com/v1';


// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(bodyParser.json({ limit: '50mb' }));

// Serve the test HTML page
app.use(express.static('./'));

// Proxy endpoint for LLM Whisperer API
app.post('/api/llmwhisperer/whisper', async (req, res) => {
  try {
    const { apiKey, fileData, fileName, options } = req.body;
    
    if (!apiKey || !fileData || !fileName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`Processing file: ${fileName} with LLM Whisperer API`);
    
    // Prepare request body for LLM Whisperer API
    const requestBody = {
      file_data: fileData,
      file_name: fileName,
      ...options
    };
    
    // Call LLM Whisperer API using the specified base URL
    const response = await fetch(`${LLM_WHISPERER_API_URL}/whisper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Get response data
    const data = await response.json();
    
    // Return response to client
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Error proxying request to LLM Whisperer API:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`LLM Whisperer Proxy Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/llm-whisperer-test.html to test the API`);
});
