// USE CORS-ANYWHERE for SOAP/POST requests (AllOrigins drops POST bodies)
// Note: You must visit https://cors-anywhere.herokuapp.com/corsdemo to enable this demo proxy first
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

// 1. Correct Endpoint derived from WSDL <service> -> <port> -> <address>
const SOAP_ENDPOINT = 'http://isapi.mekashron.com/icu-tech/icutech-test.dll/soap/IICUTech';

async function loginWithSOAP(username, password) {
    showLoading(true);
    clearMessages();
    
    // 2. Constructed SOAP Envelope
    // Matches WSDL PortType "Login" and Namespace "urn:ICUTech.Intf-IICUTech"
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ICUTech.Intf-IICUTech">
        <soap:Body>
            <urn:Login>
                <UserName>${escapeXml(username)}</UserName>
                <Password>${escapeXml(password)}</Password>
                <IPs>127.0.0.1</IPs>
            </urn:Login>
        </soap:Body>
    </soap:Envelope>`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        // 3. Fix: Use correct variable names and Proxy logic
        // We append the target URL to the Proxy URL
        const response = await fetch(PROXY_URL + SOAP_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'urn:ICUTech.Intf-IICUTech#Login',
                // specific header often needed for CORS proxies
                'X-Requested-With': 'XMLHttpRequest' 
            },
            body: soapRequest,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const xmlText = await response.text();
        return parseSoapResponse(xmlText);
        
    } catch (error) {
        throw new Error(`Connection failed: ${error.message}`);
    }
}

function parseSoapResponse(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for SOAP Faults
        const fault = xmlDoc.querySelector('faultstring');
        if (fault) throw new Error(fault.textContent || 'SOAP error');
        
        // 4. Fix: WSDL defines the output part name as "return", not "LoginResult"
        // Look for 'return' tag. Handle namespaced tags (e.g. <NS1:return>)
        const resultNode = xmlDoc.getElementsByTagName('return')[0] || 
                           xmlDoc.querySelector('return');
                           
        if (!resultNode) throw new Error('Invalid response format: <return> tag not found');
        
        // The service appears to return a JSON string inside the XML string
        const resultString = resultNode.textContent.trim();

        return {
            success: true,
            data: resultString
        };
    } catch (error) {
        console.error("XML Parse Error", xmlText);
        throw new Error(`Parse error: ${error.message}`);
    }
}

// --- Helper Utilities (kept same as your code) ---

function escapeXml(text) {
    if (!text) return '';
    return text.replace(/[<>&'"]/g, function(c) {
        switch(c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
}

// --- UI Functions (kept same as your code) ---

function showLoading(show) {
    const spinner = document.getElementById('spinner');
    const btn = document.getElementById('submitBtn');
    
    if (spinner) spinner.style.display = show ? 'inline-block' : 'none';
    if (btn) {
        btn.disabled = show;
        btn.textContent = show ? ' Connecting...' : 'Login via SOAP';
    }
}

function showSuccess(result) {
    const container = document.getElementById('resultContainer');
    const content = document.getElementById('resultContent');
    const alert = document.getElementById('errorAlert');

    if (alert) alert.style.display = 'none';
    
    if (content) {
        try {
            // The SOAP return is typically a JSON string, let's pretty print it
            const json = JSON.parse(result.data);
            content.textContent = JSON.stringify(json, null, 2);
        } catch (e) {
            content.textContent = result.data;
        }
    }
    
    if (container) {
        container.style.display = 'block';
        setTimeout(() => container.scrollIntoView({ behavior: 'smooth' }), 100);
    }
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    const msgBox = document.getElementById('errorMessage');
    const container = document.getElementById('resultContainer');
    
    if (container) container.style.display = 'none';
    
    if (msgBox) msgBox.textContent = message;
    if (alert) alert.style.display = 'block';
}

function clearMessages() {
    const alert = document.getElementById('errorAlert');
    const container = document.getElementById('resultContainer');
    if (alert) alert.style.display = 'none';
    if (container) container.style.display = 'none';
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (!usernameInput || !passwordInput) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            try {
                const result = await loginWithSOAP(username, password);
                showSuccess(result);
            } catch (error) {
                showError(error.message);
            } finally {
                showLoading(false);
            }
        });
    }
    
    // Toggle Password Visibility
    const toggleBtn = document.getElementById('togglePassword');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const input = document.getElementById('password');
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈';
            } else {
                input.type = 'password';
                this.textContent = '👁';
            }
        });
    }
});