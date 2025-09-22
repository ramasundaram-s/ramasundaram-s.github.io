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
// Mock adapters based on @actionpackd/sdk-core
const mockProviders = {
    openai: async function* (prompt, speed) {
        const response = {
            sentiment: "positive",
            confidence: 0.95,
            keywords: ["launch", "SDK", "AI", "new"],
            analysis: "The tweet shows enthusiasm about launching a new SDK, indicated by the rocket emoji. The message is concise and positive."
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
            analysis: "The tweet expresses excitement about a product launch, specifically an AI SDK. The use of an exclamation mark and rocket emoji emphasizes the positive sentiment."
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
            analysis: "This tweet demonstrates enthusiasm and achievement, announcing the launch of a new AI SDK. The rocket emoji adds a dynamic and forward-looking element to the message."
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

// Initialize syntax highlighting
function formatJSON(json) {
    return json
        .replace(/const\s+schema\s+=\s+/g, '<span class="json-keyword">const</span> <span class="json-variable">schema</span> = ')
        .replace(/z\./g, '<span class="json-zod">z.</span>')
        .replace(/\b(object|string|number|array|enum|optional)\b(?=\()/g, '<span class="json-method">$1</span>')
        .replace(/\[([^\]]*)\]/g, '[<span class="json-enum">$1</span>]')
        .replace(/('[^']*')/g, '<span class="json-string">$1</span>');
}

function updateSchemaHighlighting() {
    try {
        const schemaText = schemaEditor.textContent;
        schemaEditor.innerHTML = formatJSON(schemaText);
    } catch (e) {
        // Ignore parsing errors during editing
    }
}

function parseSchema(schemaText) {
    // Convert Zod schema to JSON Schema format
    return {
        type: 'object',
        properties: {
            sentiment: {
                type: 'string',
                enum: ['positive', 'neutral', 'negative']
            },
            confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1
            },
            keywords: {
                type: 'array',
                items: { type: 'string' }
            },
            analysis: {
                type: 'string'
            }
        },
        required: ['sentiment', 'confidence']
    };
}

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
    
    // Reset outputs
    if (streamOutput) streamOutput.textContent = '';
    if (validationOutput) validationOutput.textContent = '';
    
    try {
        // Parse schema and start streaming
        const schema = parseSchema(schemaEditor.textContent);
        isStreaming = true;
        if (runButton) {
            runButton.disabled = true;
            runButton.textContent = 'Running...';
        }
        
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

runButton?.addEventListener('click', runPlayground);

// Handle Ctrl+Enter in prompt input
promptInput?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        runPlayground();
    }
});
