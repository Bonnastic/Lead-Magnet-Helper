import './style.css'

const iframe = document.getElementById('preview-iframe');
const copyBtn = document.getElementById('copy-btn');
const deviceBtns = document.querySelectorAll('.btn-device');
const toast = document.getElementById('toast');
const btnSource = document.getElementById('btn-source');

// Sidebar Elements
const navItems = document.querySelectorAll('.nav-item');
const codePanel = document.getElementById('code-panel');
const closeCodePanel = document.getElementById('close-code-panel');
const panelTitle = document.getElementById('panel-title');
const masterTemplateInput = document.getElementById('input-master-template');

// Editor Panes
const editorHtml = document.getElementById('editor-html');
const editorFormatter = document.getElementById('editor-formatter');

// Formatter Elements
const btnUploadHelloBar = document.getElementById('btn-upload-hello-bar');
const inputFileHelloBar = document.getElementById('input-file-hello-bar');

const formatterSalesUrl = document.getElementById('formatter-sales-url');

const formatterHtmlInput = document.getElementById('formatter-html-input');
const btnUploadLmHtml = document.getElementById('btn-upload-lm-html');
const inputFileLmHtml = document.getElementById('input-file-lm-html');

const btnFixHtml = document.getElementById('btn-fix-html');
const formatterAwaiting = document.getElementById('formatter-awaiting');
const formatterResults = document.getElementById('formatter-results');
const btnCopyFixedHtml = document.getElementById('btn-copy-fixed-html');
const formatterOutput = document.getElementById('formatter-output');

// Dynamic Hello Bar Elements
const hbL1 = document.getElementById('hb-l1');
const hbL2 = document.getElementById('hb-l2');
const hbP = document.getElementById('hb-p');
const hbC = document.getElementById('hb-c');
const hbU = document.getElementById('hb-u');
const btnUploadHbHtml = document.getElementById('btn-upload-hb-html');
const inputFileHbHtml = document.getElementById('input-file-hb-html');
const resultTargetUrl = document.getElementById('result-target-url');
const hbPreviewIframe = document.getElementById('hb-preview-iframe');
const hbPreviewPlaceholder = document.querySelector('.hb-preview-placeholder');

// Right Sidebar Elements
const rightSidebar = document.getElementById('right-sidebar');
const closeRightSidebar = document.getElementById('close-right-sidebar');
const imageControls = document.getElementById('image-controls');
const emptySelection = document.getElementById('empty-selection');

// Image Edit Inputs
const imgUrlInput = document.getElementById('img-url');

let selectedImageEl = null;
let isUpdatingFromIframe = false;

// Initial template fetch
const masterTemplateEl = document.getElementById('master-template');
let baseTemplate = masterTemplateEl ? masterTemplateEl.innerHTML : '';
let hbMasterHtml = '';

// --- UTILS ---
function readFileAsText(file, targetElement) {
    const reader = new FileReader();
    reader.onload = (e) => {
        targetElement.value = e.target.result;
        targetElement.dispatchEvent(new Event('input'));
    };
    reader.readAsText(file);
}

function setupDragAndDrop(textarea) {
    textarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        textarea.classList.add('drag-over');
    });
    textarea.addEventListener('dragleave', () => {
        textarea.classList.remove('drag-over');
    });
    textarea.addEventListener('drop', (e) => {
        e.preventDefault();
        textarea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            readFileAsText(e.dataTransfer.files[0], textarea);
        }
    });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function updateFixButtonState() {
    const hasHtml = formatterHtmlInput.value.trim().length > 0;
    const hasValidUrl = isValidUrl(formatterSalesUrl.value.trim());
    
    if (hasHtml && hasValidUrl) {
        btnFixHtml.classList.add('ready');
    } else {
        btnFixHtml.classList.remove('ready');
    }
}

// --- NAV/TAB LOGIC ---
function switchNavTab(tabId) {
  navItems.forEach(item => item.classList.toggle('active', item.id === `nav-${tabId}`));
  
  const app = document.getElementById('app');
  
  if (tabId === 'html-editor') {
    panelTitle.innerText = 'Source HTML Editor';
    editorHtml.classList.add('active');
    editorFormatter.classList.remove('active');
    app.classList.remove('formatter-active');
    codePanel.classList.add('show');
  } else {
    panelTitle.innerText = 'GHL Formatter';
    editorHtml.classList.remove('active');
    editorFormatter.classList.add('active');
    app.classList.add('formatter-active');
    codePanel.classList.add('show');
  }

  btnSource.classList.add('active');
  updateTargetUrl();
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const id = item.id.replace('nav-', '');
    switchNavTab(id);
  });
});

btnSource.addEventListener('click', () => {
  codePanel.classList.toggle('show');
  btnSource.classList.toggle('active');
  if (codePanel.classList.contains('show')) {
    masterTemplateInput.focus();
  }
});

closeCodePanel.addEventListener('click', () => {
  codePanel.classList.remove('show');
  btnSource.classList.remove('active');
});

// --- GHL PROXY SCRIPT ---
const GHL_PROXY_SCRIPT = `
<script>
/* GHL_PROXY_SYSTEM_INJECTED */
(function () {
  // 1. SPINNER & GHL PROXY LOGIC
  function ensureSpinnerStyles() {
    if (document.getElementById('ghl-proxy-styles')) return;
    const style = document.createElement('style');
    style.id = 'ghl-proxy-styles';
    style.textContent = \`
      @keyframes ghl-proxy-spin { to { transform: rotate(360deg); } }
      .ghl-proxy-spinner {
        display: inline-block;
        width: 1.2em;
        height: 1.2em;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: ghl-proxy-spin 0.7s linear infinite;
        vertical-align: middle;
      }
    \`;
    document.head.appendChild(style);
  }

  function findGhlForm() {
    return document.querySelector('.form-builder--wrap, #_builder-form');
  }

  function setNativeValue(el, value) {
    const lastValue = el.value;
    el.value = value;
    if (el._valueTracker) el._valueTracker.setValue(lastValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function showSpinner(btn) {
    const rect = btn.getBoundingClientRect();
    btn.dataset.ghlOriginalHtml = btn.innerHTML;
    btn.dataset.ghlOriginalMinWidth = btn.style.minWidth || '';
    btn.dataset.ghlOriginalMinHeight = btn.style.minHeight || '';
    btn.style.minWidth = rect.width + 'px';
    btn.style.minHeight = rect.height + 'px';
    btn.innerHTML = '<span class="ghl-proxy-spinner" aria-label="Loading"></span>';
    btn.disabled = true;
  }

  function hideSpinner(btn) {
    if (!('ghlOriginalHtml' in btn.dataset)) return;
    btn.innerHTML = btn.dataset.ghlOriginalHtml;
    btn.style.minWidth = btn.dataset.ghlOriginalMinWidth;
    btn.style.minHeight = btn.dataset.ghlOriginalMinHeight;
    btn.disabled = false;
    delete btn.dataset.ghlOriginalHtml;
    delete btn.dataset.ghlOriginalMinWidth;
    delete btn.dataset.ghlOriginalMinHeight;
  }

  function mirrorAndSubmit(styledForm) {
    const ghlForm = findGhlForm();
    if (!ghlForm) return false;
    styledForm.querySelectorAll('[name]').forEach(input => {
      const name = input.getAttribute('name');
      const target = ghlForm.querySelector('[name="' + CSS.escape(name) + '"]');
      if (target) setNativeValue(target, input.value);
    });
    const ghlBtn = ghlForm.querySelector('button[type="submit"]');
    if (!ghlBtn) return false;
    ghlBtn.click();
    return true;
  }

  // 2. LINK PROPAGATOR (Sticky Funnel Logic)
  // Automatically carries the ?hb= parameter to every link on the page
  function propagateHbParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const hb = urlParams.get('hb');
    if (!hb) return;
    
    document.querySelectorAll('a').forEach(link => {
      try {
        const url = new URL(link.href, window.location.origin);
        // Only propagate to internal-ish links or sales pages
        if (url.origin === window.location.origin || url.hostname.includes('bonniefahy.com')) {
           url.searchParams.set('hb', hb);
           link.href = url.toString();
        }
      } catch (e) {}
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureSpinnerStyles();
    propagateHbParam();
    document.querySelectorAll('form').forEach(form => {
      const styledBtn = form.querySelector('button[type="submit"]');
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (styledBtn) showSpinner(styledBtn);
        const ok = mirrorAndSubmit(form);
        if (!ok && styledBtn) hideSpinner(styledBtn);
      });
    });
  });
})();
</script>
\`;>
`;

// --- FORMATTER LOGIC ---

// Sales Page URL Validation
if (formatterSalesUrl) {
    formatterSalesUrl.addEventListener('input', () => {
        const val = formatterSalesUrl.value.trim();
        if (val.length > 0 && !isValidUrl(val)) {
            formatterSalesUrl.style.borderColor = '#ef4444';
        } else {
            formatterSalesUrl.style.borderColor = '';
        }
        updateFixButtonState();
    });
}

// Lead Magnet HTML Logic
if (btnUploadLmHtml && inputFileLmHtml) {
    btnUploadLmHtml.addEventListener('click', () => inputFileLmHtml.click());
    inputFileLmHtml.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            readFileAsText(e.target.files[0], formatterHtmlInput);
        }
    });
}

if (formatterHtmlInput) {
    setupDragAndDrop(formatterHtmlInput);
    formatterHtmlInput.addEventListener('input', updateFixButtonState);
}

// Real-time URL Update
[hbL1, hbL2, hbP, hbC, hbU, formatterSalesUrl].forEach(el => {
    if (el) el.addEventListener('input', updateTargetUrl);
});

// Hello Bar File Mapping Logic
if (btnUploadHbHtml && inputFileHbHtml) {
    btnUploadHbHtml.addEventListener('click', () => inputFileHbHtml.click());
    inputFileHbHtml.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                hbMasterHtml = event.target.result;
                mapHelloBarToFields(hbMasterHtml);
            };
            reader.readAsText(e.target.files[0]);
        }
    });
}

function mapHelloBarToFields(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const line1 = doc.querySelector('.hello-line1');
    const line2 = doc.querySelector('.hello-line2');
    const price = doc.querySelector('.price-pill');
    const cta = doc.querySelector('.hello-cta');

    if (line1) hbL1.value = line1.innerHTML.trim();
    
    if (line2) {
        // Clone to avoid modifying the parsed doc in case we need it
        const line2Clone = line2.cloneNode(true);
        // Find and remove the price pill from the clone if it exists inside
        const internalPrice = line2Clone.querySelector('.price-pill');
        if (internalPrice) {
            internalPrice.remove();
        }
        hbL2.value = line2Clone.innerHTML.trim();
    }

    if (price) hbP.value = price.innerText.trim();
    if (cta) {
        hbC.value = cta.innerText.trim();
        hbU.value = cta.getAttribute('href') || '';
    }

    updateTargetUrl();
}


// NOTE: No hardcoded Hello Bar CSS template — the uploaded HTML file is used as-is.

/**
 * Mutates a parsed document by injecting field values and forcing the bar visible.
 * Shared by both the preview builder and formatter output builder.
 */
function injectFieldsIntoDoc(doc, data) {
    const line1 = doc.querySelector('.hello-line1');
    const line2 = doc.querySelector('.hello-line2');
    const price = doc.querySelector('.price-pill');
    const cta   = doc.querySelector('.hello-cta');
    const bar   = doc.querySelector('.hello-bar');

    if (line1 && data.l1) line1.innerHTML = data.l1;

    if (line2) {
        const internalPrice = line2.querySelector('.price-pill');
        if (internalPrice && data.p) internalPrice.innerText = data.p;
        const textNodes = Array.from(line2.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 0 && data.l2) {
            textNodes[0].textContent = data.l2 + ' ';
        } else if (!internalPrice && data.l2) {
            line2.prepend(document.createTextNode(data.l2 + ' '));
        }
    } else if (price && data.p) {
        price.innerText = data.p;
    }

    if (cta) {
        if (data.c) cta.textContent = data.c;
        if (data.u) cta.href = data.u;
    }

    // Force the bar visible (it may be display:none in the source for GHL runtime)
    if (bar) {
        bar.style.display = 'block';
        bar.style.width   = '100%';
    }
}

/**
 * Builds the srcdoc for the live preview iframe.
 * Always returns a full HTML document so <style>/<link> tags in <head> are applied.
 * DOMParser moves styles from a snippet into <head> — we must include both head + body.
 * Returns null if no file has been uploaded.
 */
function buildHbPreviewHtml(data) {
    if (!hbMasterHtml) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(hbMasterHtml, 'text/html');
    injectFieldsIntoDoc(doc, data);

    // Full HTML document — return as-is
    if (hbMasterHtml.toLowerCase().includes('<html')) {
        return doc.documentElement.outerHTML;
    }

    // Snippet: DOMParser splits <style>/<link> into <head> and <div> into <body>.
    // We must wrap both into a proper full HTML doc so the iframe gets all styles.
    const headHtml = doc.head.innerHTML.trim();
    const bodyHtml = doc.body.innerHTML.trim();
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
/* Preview responsive overrides — keeps content within iframe width, no scrollbars */
*,*::before,*::after{box-sizing:border-box !important;}
html,body{
  margin:0;padding:0;
  overflow:hidden !important;
  width:100%;
  scrollbar-width:none;
  -ms-overflow-style:none;
}
html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}
.hello-bar{
  width:100% !important;
  max-width:100% !important;
  overflow:hidden !important;
  word-break:break-word;
}
.hello-line1,.hello-line2{
  max-width:100%;
  word-wrap:break-word;
  overflow-wrap:break-word;
  white-space:normal !important;
}
.hello-line2{
  flex-wrap:wrap !important;
  justify-content:center !important;
}
</style>
${headHtml}
</head>
<body>
${bodyHtml}
</body></html>`;
}

/**
 * Generates the Hello Bar HTML for formatter output.
 * Only works when an HTML file has been uploaded (hbMasterHtml).
 * Returns head content + body content as a snippet, preserving the original structure.
 * No external CSS template is injected — the uploaded file's own styles are kept.
 */
function generateHelloBarHtml(data) {
    if (!hbMasterHtml) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(hbMasterHtml, 'text/html');
    injectFieldsIntoDoc(doc, data);

    if (hbMasterHtml.toLowerCase().includes('<html')) {
        return doc.documentElement.outerHTML;
    }

    // Snippet: reconstruct by combining head (styles/links) and body (markup)
    const headContent = doc.head.innerHTML.trim();
    const bodyContent = doc.body.innerHTML.trim();
    return headContent ? `${headContent}\n${bodyContent}` : bodyContent;
}

function updateHbPreview() {
    if (!hbPreviewIframe) return;

    const hbData = {
        l1: hbL1.value.trim(),
        l2: hbL2.value.trim(),
        p: hbP.value.trim(),
        c: hbC.value.trim(),
        u: hbU.value.trim()
    };

    // Preview only works when an HTML file has been uploaded
    const previewHtml = buildHbPreviewHtml(hbData);

    if (previewHtml) {
        // Attach onload BEFORE srcdoc to avoid the race condition
        hbPreviewIframe.onload = () => {
            const iDoc = hbPreviewIframe.contentDocument || hbPreviewIframe.contentWindow.document;
            const bar  = iDoc ? iDoc.querySelector('.hello-bar') : null;
            if (bar) {
                bar.style.display = 'block';
                bar.style.width   = '100%';
            }
            // Auto-resize iframe to fit its content — no scrollbar needed
            if (iDoc && iDoc.documentElement) {
                const contentHeight = iDoc.documentElement.scrollHeight;
                hbPreviewIframe.style.height = contentHeight + 'px';
            }
        };
        hbPreviewIframe.srcdoc = previewHtml;
        if (hbPreviewPlaceholder) hbPreviewPlaceholder.style.display = 'none';
        hbPreviewIframe.style.display = 'block';
    } else {
        // No uploaded file — hide the preview and show the placeholder
        hbPreviewIframe.onload = null;
        hbPreviewIframe.srcdoc = '';
        hbPreviewIframe.style.display = 'none';
        if (hbPreviewPlaceholder) hbPreviewPlaceholder.style.display = 'block';
    }
}



function updateTargetUrl() {
    updateHbPreview();
    const baseUrl = formatterSalesUrl.value.trim();
    if (!baseUrl) return;

    const payload = {
        l1: hbL1.value.trim(),
        l2: hbL2.value.trim(),
        p: hbP.value.trim(),
        c: hbC.value.trim(),
        u: hbU.value.trim()
    };

    let targetUrl = baseUrl;
    if (payload.l1 || payload.l2 || payload.p || payload.c) {
        const encoded = encodePayload(payload);
        const separator = baseUrl.includes('?') ? '&' : '?';
        targetUrl = `${baseUrl}${separator}hb=${encoded}`;
    }
    
    if (resultTargetUrl) {
        resultTargetUrl.value = targetUrl;
    }
}

/**
 * Encodes a string to URL-safe Base64
 */
function encodePayload(obj) {
    const json = JSON.stringify(obj);
    const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function processGhlHtml() {
    let html = formatterHtmlInput.value;
    const shouldInjectHb = document.getElementById('toggle-inject-hb').checked;
    updateTargetUrl(); 

    // 1. CLEANUP: Remove any existing GHL-injected blocks to prevent duplicates
    // Remove blocks between GHL comments
    html = html.replace(/<!-- ========== GHL START: Dynamic Hello Bar ========== -->[\s\S]*?<!-- ========== GHL END: Dynamic Hello Bar ========== -->/g, "");
    
    // Generate dynamic Hello Bar HTML for injection if enabled (needed for output later)
    let helloBarHtml = "";
    if (shouldInjectHb) {
        const hbData = {
            l1: hbL1.value.trim(),
            l2: hbL2.value.trim(),
            p: hbP.value.trim(),
            c: hbC.value.trim(),
            u: hbU.value.trim()
        };
        helloBarHtml = generateHelloBarHtml(hbData);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove stray Hello Bar elements that might not have comments
    doc.querySelectorAll('.hello-bar').forEach(el => el.remove());
    
    // Remove existing GHL Proxy scripts and styles
    doc.querySelectorAll('script').forEach(script => {
        const content = script.textContent;
        if (content.includes('GHL_PROXY_SYSTEM_INJECTED') || 
            content.includes('ghl-proxy-spin') ||
            content.includes('mirrorAndSubmit') ||
            content.includes('setNativeValue') ||
            content.includes('_builder-form') ||
            content.includes('form-builder--wrap') ||
            content.includes('[GHL Proxy]')) {
            script.remove();
        }
    });
    doc.querySelectorAll('style').forEach(style => {
        if (style.id === 'ghl-proxy-styles' || style.textContent.includes('.hello-bar')) {
            style.remove();
        }
    });

    // 2. Identify and Fix Name/Email fields
    const allInputs = doc.querySelectorAll('input');
    allInputs.forEach(input => {
        const placeholder = (input.placeholder || "").toLowerCase();
        const type = (input.type || "").toLowerCase();
        const name = (input.name || "").toLowerCase();

        // Standardize Name fields
        if (placeholder.includes('name') || name.includes('name')) {
            if (!input.getAttribute('name')) input.setAttribute('name', 'first_name');
        }

        // Standardize Email fields
        if (type === 'email' || placeholder.includes('email') || name.includes('email')) {
            if (!input.getAttribute('name')) input.setAttribute('name', 'email');
        }
    });

    // 3. Ensure a <form> tag exists and has a submit button
    let form = doc.querySelector('form');
    if (!form) {
        form = doc.createElement('form');
        while (doc.body.firstChild) {
            form.appendChild(doc.body.firstChild);
        }
        doc.body.appendChild(form);
    }

    // Ensure at least one button is type="submit"
    const buttons = form.querySelectorAll('button');
    if (buttons.length > 0) {
        let hasSubmit = false;
        buttons.forEach(btn => {
            if (btn.type === 'submit') hasSubmit = true;
        });
        if (!hasSubmit) {
            buttons[buttons.length - 1].setAttribute('type', 'submit');
        }
    }

    // 4. Prep output
    const hasHtmlTag = html.toLowerCase().includes('<html');
    const hasHeadTag = html.toLowerCase().includes('<head');
    const shouldInjectForm = document.getElementById('toggle-inject-form').checked;

    let outputHtml = "";
    if (hasHtmlTag || hasHeadTag) {
        if (shouldInjectForm) {
            const scriptTag = doc.createElement('div');
            scriptTag.innerHTML = GHL_PROXY_SCRIPT;
            doc.body.appendChild(scriptTag.firstElementChild);
        }
        outputHtml = doc.documentElement.outerHTML;
    } else {
        const headContent = doc.head.innerHTML.trim();
        const bodyContent = doc.body.innerHTML.trim();
        outputHtml = headContent ? `${headContent}\n${bodyContent}` : bodyContent;
        if (shouldInjectForm) {
            outputHtml += `\n${GHL_PROXY_SCRIPT}`;
        }
    }
    
    // 5. Inject Hello Bar if generated
    if (helloBarHtml) {
        outputHtml = `${helloBarHtml}\n${outputHtml}`;
    }
    
    formatterOutput.textContent = outputHtml;
}

btnFixHtml.addEventListener('click', () => {
    if (!btnFixHtml.classList.contains('ready')) return;
    
    btnFixHtml.innerText = 'Formatting HTML...';
    btnFixHtml.disabled = true;

    setTimeout(() => {
        processGhlHtml();
        formatterAwaiting.style.display = 'none';
        formatterResults.style.display = 'block';
        btnFixHtml.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Fix HTML`;
        btnFixHtml.disabled = false;
        
        formatterResults.scrollIntoView({ behavior: 'smooth' });
    }, 800);
});

btnCopyFixedHtml.addEventListener('click', () => {
    const code = formatterOutput.textContent;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = btnCopyFixedHtml.innerHTML;
        btnCopyFixedHtml.innerText = '✅ Copied!';
        setTimeout(() => { btnCopyFixedHtml.innerHTML = originalText; }, 2000);
    });
});

// Copy Dynamic URL Logic
const btnCopyUrl = document.getElementById('btn-copy-url');
const btnCopyResultUrl = document.querySelector('.target-url-card .btn-copy-sm');

function performUrlCopy(btn) {
    if (resultTargetUrl && resultTargetUrl.value) {
        navigator.clipboard.writeText(resultTargetUrl.value).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = btn === btnCopyUrl ? '<span class="icon">✅</span> COPIED!' : '✅';
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
        });
    } else if (btn === btnCopyUrl) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="icon">⚠️</span> NO URL';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }
}

if (btnCopyUrl) btnCopyUrl.addEventListener('click', () => performUrlCopy(btnCopyUrl));
if (btnCopyResultUrl) btnCopyResultUrl.addEventListener('click', () => performUrlCopy(btnCopyResultUrl));

// Real-time URL updates as user types
[hbL1, hbL2, hbP, hbC, hbU, formatterSalesUrl].forEach(input => {
    if (input) {
        input.addEventListener('input', updateTargetUrl);
    }
});

// --- CORE PREVIEW LOGIC ---
function updatePreview() {
  if (isUpdatingFromIframe) return;
  iframe.srcdoc = baseTemplate;
}

iframe.addEventListener('load', () => {
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  
  const style = doc.createElement('style');
  style.id = 'preview-editor-styles';
  style.textContent = `
    [contenteditable="true"]:hover { outline: 1px dashed #3182ce !important; cursor: text !important; }
    [contenteditable="true"]:focus { outline: 2px solid #3182ce !important; background: rgba(49, 130, 206, 0.05) !important; }
    img:hover { outline: 2px solid #3182ce !important; cursor: pointer !important; filter: brightness(1.05) !important; }
    .selected-element { outline: 2px solid #3182ce !important; box-shadow: 0 0 20px rgba(49, 130, 206, 0.2) !important; }
  `;
  doc.head.appendChild(style);

  const syncAll = () => {
    style.remove();
    if (selectedImageEl) selectedImageEl.classList.remove('selected-element');
    const currentHTML = doc.documentElement.outerHTML;
    isUpdatingFromIframe = true;
    baseTemplate = currentHTML;
    if (masterTemplateInput) masterTemplateInput.value = baseTemplate;
    setTimeout(() => { isUpdatingFromIframe = false; }, 10);
    doc.head.appendChild(style);
    if (selectedImageEl) selectedImageEl.classList.add('selected-element');
  };

  doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, b, strong, .button-text').forEach(el => {
    if (el.children.length === 0 || (el.children.length > 0 && el.innerText.trim() !== '')) {
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('input', syncAll);
      el.addEventListener('blur', syncAll);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelection();
      });
    }
  });

  doc.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSelection();
      selectedImageEl = img;
      img.classList.add('selected-element');
      rightSidebar.classList.add('show');
      imageControls.style.display = 'block';
      emptySelection.style.display = 'none';
      imgUrlInput.value = img.src || '';
    });
  });

  doc.addEventListener('click', () => clearSelection());
});

function clearSelection() {
  if (selectedImageEl) {
    selectedImageEl.classList.remove('selected-element');
    selectedImageEl = null;
  }
  rightSidebar.classList.remove('show');
}

imgUrlInput.addEventListener('input', () => {
  if (selectedImageEl) selectedImageEl.src = imgUrlInput.value;
});

closeRightSidebar.addEventListener('click', () => clearSelection());

if (masterTemplateInput) {
  masterTemplateInput.value = baseTemplate;
  masterTemplateInput.addEventListener('input', () => {
    baseTemplate = masterTemplateInput.value;
    updatePreview();
  });
}

deviceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    deviceBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.device === 'mobile') iframe.classList.add('mobile');
    else iframe.classList.remove('mobile');
  });
});

copyBtn.addEventListener('click', () => {
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const editorStyles = doc.getElementById('preview-editor-styles');
  if (editorStyles) editorStyles.remove();
  doc.querySelectorAll('.selected-element').forEach(el => el.classList.remove('selected-element'));
  doc.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
  let html = doc.documentElement.outerHTML;
  navigator.clipboard.writeText(html).then(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
    iframe.srcdoc = baseTemplate; 
  });
});

updatePreview();
updateTargetUrl();
switchNavTab('ghl-formatter');
