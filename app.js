// Mobile menu functionality
const mobileMenuButton = document.querySelector('.mobile-menu-button');
const navLinks = document.querySelector('.nav-links');

mobileMenuButton?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
});

// Copy button functionality
document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', () => {
        const pre = button.closest('div').querySelector('pre');
        if (!pre) return;
        
        navigator.clipboard.writeText(pre.textContent || '');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
});

// Mock Providers
const mockProviders = {
    openai: async function* (prompt) {
        const response = {
            response: "This is a mock OpenAI response for: " + prompt,
            confidence: 0.95
        };
        
        const tokens = JSON.stringify(response, null, 2).split(' ');
        for (const token of tokens) {
            yield token + ' ';
            await new Promise(r => setTimeout(r, 50));
        }
    },
    
    anthropic: async function* (prompt) {
        const response = `Here's my analysis:
        {
            "response": "Mock Anthropic response to: ${prompt}",
            "reasoning": "This is a mock reasoning process",
            "confidence": 0.92
        }`;
        
        const tokens = response.split(' ');
        for (const token of tokens) {
            yield token + ' ';
            await new Promise(r => setTimeout(r, 30));
        }
    },
    
    gemini: async function* (prompt) {
        const response = {
            response: "Mock Gemini processing: " + prompt,
            metadata: {
                model: "gemini-mock",
                timestamp: new Date().toISOString()
            }
        };
        
        const tokens = JSON.stringify(response, null, 2).split('');
        for (const token of tokens) {
            yield token;
            await new Promise(r => setTimeout(r, 20));
        }
    }
};

// Playground functionality
const providerSelect = document.getElementById('provider-select');
const promptInput = document.getElementById('prompt-input');
const runButton = document.getElementById('run-button');
const streamOutput = document.getElementById('stream-output');
const validationOutput = document.getElementById('validation-output');

let isStreaming = false;

async function runPlayground() {
    if (isStreaming) return;
    
    const provider = providerSelect?.value || 'openai';
    const prompt = promptInput?.value || '';
    const schemaElement = document.querySelector('.schema-code');
    let schema = null;
    
    // Reset outputs
    if (streamOutput) streamOutput.textContent = '';
    if (validationOutput) validationOutput.textContent = '';
    
    // Parse schema if present
    if (schemaElement) {
        try {
            schema = JSON.parse(schemaElement.textContent);
        } catch (e) {
            if (validationOutput) {
                validationOutput.textContent = 'Schema parse error: ' + e.message;
                validationOutput.style.color = '#ff6b6b';
            }
            return;
        }
    }
    
    isStreaming = true;
    if (runButton) runButton.disabled = true;
    
    try {
        const mockProvider = mockProviders[provider];
        for await (const token of mockProvider(prompt)) {
            if (streamOutput) {
                streamOutput.textContent += token;
            }
        }
        
        // Validate against schema if present
        if (schema && streamOutput?.textContent) {
            try {
                const response = JSON.parse(streamOutput.textContent);
                const validation = validateAgainstSchema(response, schema);
                if (validationOutput) {
                    validationOutput.textContent = 'Validation: ' + (validation ? 'Success ✓' : 'Failed ✗');
                    validationOutput.style.color = validation ? '#4caf50' : '#ff6b6b';
                }
            } catch (e) {
                if (validationOutput) {
                    validationOutput.textContent = 'Invalid JSON output';
                    validationOutput.style.color = '#ff6b6b';
                }
            }
        }
    } catch (e) {
        if (streamOutput) streamOutput.textContent = 'Error: ' + e.message;
    } finally {
        isStreaming = false;
        if (runButton) runButton.disabled = false;
    }
}

// Simple schema validation
function validateAgainstSchema(data, schema) {
    if (schema.type === 'object') {
        if (typeof data !== 'object' || Array.isArray(data)) return false;
        
        for (const [key, prop] of Object.entries(schema.properties || {})) {
            if (data[key] === undefined) return false;
            if (prop.type === 'string' && typeof data[key] !== 'string') return false;
            if (prop.type === 'number' && typeof data[key] !== 'number') return false;
            if (prop.type === 'boolean' && typeof data[key] !== 'boolean') return false;
            if (prop.enum && !prop.enum.includes(data[key])) return false;
        }
        return true;
    }
    return false;
}

runButton?.addEventListener('click', runPlayground);

// Handle Ctrl+Enter in prompt input
promptInput?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        runPlayground();
    }
});
