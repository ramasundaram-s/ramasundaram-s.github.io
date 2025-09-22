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

// Mock Providers with realistic responses
const mockProviders = {
    openai: async function* (prompt, speed) {
        const response = {
            sentiment: "positive",
            confidence: 0.95,
            keywords: ["launch", "SDK", "AI", "new"]
        };
        
        const tokens = JSON.stringify(response, null, 2).split('');
        for (const token of tokens) {
            yield token;
            await new Promise(r => setTimeout(r, 100 - speed));
        }
    },
    
    anthropic: async function* (prompt, speed) {
        const response = {
            sentiment: "positive",
            confidence: 0.92,
            keywords: ["launch", "SDK", "AI"],
            analysis: "The tweet expresses excitement about a product launch"
        };
        
        const tokens = JSON.stringify(response, null, 2).split('');
        for (const token of tokens) {
            yield token;
            await new Promise(r => setTimeout(r, 100 - speed));
        }
    },
    
    gemini: async function* (prompt, speed) {
        const response = {
            sentiment: "positive",
            confidence: 0.89,
            keywords: ["launch", "SDK", "AI", "🚀"],
            metadata: {
                model: "gemini-mock",
                timestamp: new Date().toISOString()
            }
        };
        
        const tokens = JSON.stringify(response, null, 2).split('');
        for (const token of tokens) {
            yield token;
            await new Promise(r => setTimeout(r, 100 - speed));
        }
    }
};

// Playground functionality
const providerSelect = document.getElementById('provider-select');
const promptInput = document.getElementById('prompt-input');
const runButton = document.getElementById('run-button');
const streamOutput = document.getElementById('stream-output');
const validationOutput = document.getElementById('validation-output');
const speedSlider = document.getElementById('speed-slider');
const schemaEditor = document.querySelector('.schema-editor');

let isStreaming = false;

// Initialize syntax highlighting for schema
function formatJSON(json) {
    return json.replace(/"(\w+)":/g, '"<span class="json-key">$1</span>":');
}

function updateSchemaHighlighting() {
    try {
        const schema = JSON.parse(schemaEditor.textContent);
        schemaEditor.innerHTML = formatJSON(JSON.stringify(schema, null, 2));
    } catch (e) {
        // Ignore parsing errors during editing
    }
}

schemaEditor?.addEventListener('input', () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    updateSchemaHighlighting();
    selection.removeAllRanges();
    selection.addRange(range);
});

schemaEditor?.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
});

async function runPlayground() {
    if (isStreaming) return;
    
    const provider = providerSelect?.value || 'openai';
    const prompt = promptInput?.value || '';
    const speed = parseInt(speedSlider?.value || '50');
    let schema = null;
    
    // Reset outputs
    if (streamOutput) streamOutput.textContent = '';
    if (validationOutput) validationOutput.textContent = '';
    
    // Parse schema
    try {
        schema = JSON.parse(schemaEditor.textContent);
    } catch (e) {
        validationOutput.innerHTML = `<span style="color: #ff6b6b">❌ Schema parse error: ${e.message}</span>`;
        return;
    }
    
    isStreaming = true;
    if (runButton) {
        runButton.disabled = true;
        runButton.textContent = 'Running...';
    }
    
    try {
        const mockProvider = mockProviders[provider];
        let response = '';
        
        for await (const token of mockProvider(prompt, speed)) {
            response += token;
            if (streamOutput) {
                streamOutput.innerHTML = `<pre>${formatJSON(response)}</pre>`;
            }
        }
        
        // Validate against schema
        try {
            const parsedResponse = JSON.parse(response);
            const validation = validateAgainstSchema(parsedResponse, schema);
            if (validationOutput) {
                if (validation.valid) {
                    validationOutput.innerHTML = `<span style="color: #4caf50">✓ Schema validation passed</span>`;
                } else {
                    validationOutput.innerHTML = `<span style="color: #ff6b6b">❌ Schema validation failed: ${validation.error}</span>`;
                }
            }
        } catch (e) {
            validationOutput.innerHTML = `<span style="color: #ff6b6b">❌ Invalid JSON response</span>`;
        }
    } catch (e) {
        if (streamOutput) streamOutput.textContent = 'Error: ' + e.message;
    } finally {
        isStreaming = false;
        if (runButton) {
            runButton.disabled = false;
            runButton.textContent = '▶ Run Analysis';
        }
    }
}

// Enhanced schema validation
function validateAgainstSchema(data, schema) {
    function validateType(value, type) {
        switch (type) {
            case 'string': return typeof value === 'string';
            case 'number': return typeof value === 'number';
            case 'boolean': return typeof value === 'boolean';
            case 'array': return Array.isArray(value);
            case 'object': return typeof value === 'object' && !Array.isArray(value);
            default: return true;
        }
    }
    
    function validate(data, schema) {
        // Check type
        if (!validateType(data, schema.type)) {
            return { valid: false, error: `Expected type ${schema.type}` };
        }
        
        // Check enum
        if (schema.enum && !schema.enum.includes(data)) {
            return { valid: false, error: `Value must be one of: ${schema.enum.join(', ')}` };
        }
        
        // Check number constraints
        if (schema.type === 'number') {
            if (schema.minimum !== undefined && data < schema.minimum) {
                return { valid: false, error: `Value must be >= ${schema.minimum}` };
            }
            if (schema.maximum !== undefined && data > schema.maximum) {
                return { valid: false, error: `Value must be <= ${schema.maximum}` };
            }
        }
        
        // Check array
        if (schema.type === 'array' && schema.items) {
            for (const item of data) {
                const itemValidation = validate(item, schema.items);
                if (!itemValidation.valid) {
                    return { valid: false, error: `Array item: ${itemValidation.error}` };
                }
            }
        }
        
        // Check object
        if (schema.type === 'object') {
            // Check required properties
            if (schema.required) {
                for (const required of schema.required) {
                    if (!(required in data)) {
                        return { valid: false, error: `Missing required property: ${required}` };
                    }
                }
            }
            
            // Validate properties
            for (const [key, value] of Object.entries(data)) {
                if (schema.properties && schema.properties[key]) {
                    const propValidation = validate(value, schema.properties[key]);
                    if (!propValidation.valid) {
                        return { valid: false, error: `Property ${key}: ${propValidation.error}` };
                    }
                }
            }
        }
        
        return { valid: true };
    }
    
    return validate(data, schema);
}

runButton?.addEventListener('click', runPlayground);

// Handle Ctrl+Enter in prompt input
promptInput?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        runPlayground();
    }
});
