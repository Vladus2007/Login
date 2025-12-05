// Используем самую надежную бесплатную прокси
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

// Основные функции
async function loginWithSOAP(username, password) {
    showLoading(true);
    clearMessages();
    
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <Login xmlns="urn:ICUTech.Intf-IICUTech">
            <UserName>${escapeXml(username)}</UserName>
            <Password>${escapeXml(password)}</Password>
            <IPs>127.0.0.1</IPs>
        </Login>
    </soap:Body>
</soap:Envelope>`;
    
   //const endpoint = 'http://isapi.mekashron.com/icu-tech/icu-tech-test.dll';
    const endpoin='http://www.borland.com/namespaces/Types';
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(PROXY_URL + encodeURIComponent(endpoint), {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'urn:ICUTech.Intf-IICUTech#Login'
            },
            body: soapRequest,
            signal: controller.signal
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
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
        
        const fault = xmlDoc.querySelector('faultstring');
        if (fault) throw new Error(fault.textContent || 'SOAP error');
        
        const result = xmlDoc.querySelector('LoginResult');
        if (!result) throw new Error('Invalid response format');
        
        return {
            success: true,
            data: result.textContent.trim()
        };
    } catch (error) {
        throw new Error(`Parse error: ${error.message}`);
    }
}

function escapeXml(text) {
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

function showLoading(show) {
    const spinner = document.getElementById('spinner');
    const btn = document.getElementById('submitBtn');
    
    if (show) {
        spinner.style.display = 'inline-block';
        btn.disabled = true;
        btn.textContent = ' Connecting...';
    } else {
        spinner.style.display = 'none';
        btn.disabled = false;
        btn.textContent = 'Login via SOAP';
    }
}

function showSuccess(result) {
    const container = document.getElementById('resultContainer');
    const content = document.getElementById('resultContent');
    
    try {
        const json = JSON.parse(result.data);
        content.textContent = JSON.stringify(json, null, 2);
    } catch {
        content.textContent = result.data;
    }
    
    container.style.display = 'block';
    document.getElementById('errorAlert').style.display = 'none';
    
    // Smooth scroll
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth' }), 100);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    document.getElementById('errorMessage').textContent = message;
    alert.style.display = 'block';
    document.getElementById('resultContainer').style.display = 'none';
}

function clearMessages() {
    document.getElementById('errorAlert').style.display = 'none';
    document.getElementById('resultContainer').style.display = 'none';
}

function copyResult() {
    const text = document.getElementById('resultContent').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.currentTarget;
        const original = btn.innerHTML;
        btn.innerHTML = '✓';
        setTimeout(() => btn.innerHTML = original, 1500);
    });
}

// Event handlers
function initEventListeners() {
    document.getElementById('togglePassword').addEventListener('click', function() {
        const input = document.getElementById('password');
        if (input.type === 'password') {
            input.type = 'text';
            this.textContent = '🙈';
        } else {
            input.type = 'password';
            this.textContent = '👁';
        }
    });
    
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!this.checkValidity()) {
            this.classList.add('was-validated');
            return;
        }
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        try {
            const result = await loginWithSOAP(username, password);
            if (result.success) showSuccess(result);
        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
        }
    });
}

// Performance optimization
function initPerformanceOptimizations() {
    // Загружаем иконки только если нужны
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            // Можно загрузить иконки если нужно
        });
    }
    
    // Убираем возможный layout shift
    const btn = document.getElementById('submitBtn');
    btn.style.minHeight = btn.offsetHeight + 'px';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    initPerformanceOptimizations();
});
