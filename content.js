// content.js — Right-docked, vertical-only drag. Paste/Upload previews in-box with Delete.
// Selfie camera appears in its paste box; Snap stops the camera.
// Calls IDM-VTON Space via background.js and shows result on the right.

//////////////////// Host & Shadow ////////////////////
const host = document.createElement('div');
host.id = 'vton-right-host';
Object.assign(host.style, {
  position: 'fixed',
  top: '40%',
  right: '0',            // dock to RIGHT
  zIndex: '2147483647',
});
document.documentElement.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });

//////////////////// Styles ////////////////////
const style = document.createElement('style');
style.textContent = `
  :host { all: initial; }

  /* Right-side tab that sticks out to the left */
  .tab {
    position: absolute; left: -80px; top: 30px;
    width: 80px; height: 80px;
    background: #38b6ff;
    border-radius: 12px 0 0 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: ns-resize; user-select: none;
  }

  /* Ensure the tab icon fills the box nicely */
  .tab img#tab-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 12px 0 0 12px;
  }
  
  .panel {
    width: 360px;
    background: #fff; color: #111;
    border: 1px solid #ddd; border-right: none;       /* open to page on the left */
    border-radius: 8px 0 0 8px;
    box-shadow: 0 6px 24px rgba(0,0,0,.18);
    font: 400 13px system-ui;
    display: none;
    position: relative;
    transition: width .2s ease;
  }
  .panel.open { display: block; }

  /* When we have a result, widen the panel */
  .panel.has-result {
    width: 680px;
  }

  .header {
    padding: 8px 10px;
    background: #000000ff; color: #eee;
    border-bottom:1px solid #eee;
    display:flex; align-items:center; justify-content: space-between;
    font-weight:600; cursor: ns-resize;               /* vertical drag */
    border-radius: 8px 0 0 0;
  }

  .body {
    padding: 12px;
    display: flex;
    gap: 12px;
  }

  .body-main {
    flex: 1;
    min-width: 0;
  }

  .body-result {
    width: 280px;
    display: none;
    align-items: flex-start;
    justify-content: center;
  }

  .panel.has-result .body-result {
    display: flex;
  }

  .row { margin-bottom: 12px; }

  .pasteBox {
    position: relative;
    border: 2px dashed #558bc9ff; border-radius: 10px;
    padding: 12px; min-height: 120px;
    display:flex; align-items:center; justify-content:center;
    text-align:center; color:#555; background:#fafafa;
    transition: border-color .15s, background .15s, box-shadow .15s;
    outline: none;
  }
  .pasteBox.active {
    border-color:#111; background:#fff;
    box-shadow: 0 0 0 3px rgba(0, 60, 170, 0.22) inset;
  }
  .pastePrompt { pointer-events:none; }
  .pastePrompt small { color:#777; display:block; margin-top: 2px; }

  .previewImg, .previewVideo {
    max-width: 100%; max-height: 240px; border-radius: 10px;
    display:none; object-fit: contain; background:#000;
  }

  .deleteBtn {
    position: absolute; top: 8px; right: 8px;
    display:none;
    padding:4px 8px; border-radius:8px; border:1px solid #ccc;
    background:#fff; color:#111; cursor:pointer;
  }

  .controls { display:flex; gap:8px; margin-top:8px; flex-wrap: wrap; }
  button { padding:6px 10px; border-radius:8px; border:1px solid #ccc; background:#111; color:#fff; cursor:pointer; }
  button.secondary { background:#fff; color:#111; }

  .footer { display:flex; gap:8px; }

  .result {
    width:100%;
    border-radius:10px;
    display:none;
    max-height: 480px;
    object-fit: contain;
    border: 1px solid #eee;
  }

  .status {
    font-size: 12px;
    color: #666;
    margin-top: 6px;
  }
`;
shadow.appendChild(style);

//////////////////// Markup ////////////////////
const ui = document.createElement('div');
ui.innerHTML = `
  <div class="panel" id="vton-panel">
    <div class="header" id="vton-header">
      <span>TryMe Virtual Try-On</span>
    </div>
    <div class="body">
      <div class="body-main">
        <!-- Garment -->
        <div class="row">
          <div id="g-box" class="pasteBox" tabindex="0" aria-label="Garment paste area">
            <div class="pastePrompt"><strong>Paste Garment Image here</strong><small>(Click to select, then Ctrl/Cmd + V)</small></div>
            <img id="g-preview" class="previewImg" alt="Garment Preview">
            <button id="g-delete" class="deleteBtn" title="Remove image">Delete</button>
          </div>
          <div class="controls">
            <input id="g-file" type="file" accept="image/*" style="display:none">
            <button id="g-upload" class="secondary">Upload Garment</button>
            <button id="g-reverse" class="secondary">Find this garment on the web</button>
          </div>
        </div>
        <!-- Selfie -->
        <div class="row">
          <div id="s-box" class="pasteBox" tabindex="0" aria-label="Selfie paste area">
            <div class="pastePrompt"><strong>Paste Selfie here</strong><small>(Click to select, then Ctrl/Cmd + V)</small></div>
            <video id="s-video" class="previewVideo" autoplay playsinline muted></video>
            <img id="s-preview" class="previewImg" alt="Selfie Preview">
            <button id="s-delete" class="deleteBtn" title="Remove">Delete</button>
          </div>
          <div class="controls">
            <input id="s-file" type="file" accept="image/*" style="display:none">
            <button id="s-upload" class="secondary">Upload Selfie</button>
            <button id="s-camera">Camera</button>
            <button id="s-snap" class="secondary" style="display:none">Snap</button>
          </div>
        </div>

        <div class="footer">
          <button id="try" style="flex:1">Try Me</button>
          <button id="clear" class="secondary">Clear</button>
        </div>

        <div class="status" id="status"></div>
      </div>

      <div class="body-result">
        <img id="result" class="result" alt="Result">
      </div>
    </div>
  </div>

  <div class="tab" id="vton-tab" title="Drag up/down • Click to open">
    <img id="tab-icon" alt="TryMe tab icon">
  </div>

`;
shadow.appendChild(ui);

// Set tab + header + try button images after UI is in the shadow DOM
const tabIconEl = shadow.getElementById('tab-icon');
if (tabIconEl) {
  tabIconEl.src = chrome.runtime.getURL('assets/tab-icon.png');
}

//////////////////// State ////////////////////
let activeBox = 'g';    // 'g' or 's'
let mediaStream = null;
let garmentBlob = null;
let selfieBlob = null;
let dragJustHappened = false;

//////////////////// Helpers ////////////////////
function setActive(which) {
  activeBox = which;
  ['g-box','s-box'].forEach(id => shadow.getElementById(id).classList.remove('active'));
  shadow.getElementById(`${which}-box`).classList.add('active');
  shadow.getElementById(`${which}-box`).focus();
}

function setStatus(msg) {
  shadow.getElementById('status').textContent = msg || '';
}

function showImageInBox(kind, blobOrFileUrl) {
  const box = shadow.getElementById(`${kind}-box`);
  const img = shadow.getElementById(`${kind}-preview`);
  const del = shadow.getElementById(`${kind}-delete`);
  const prompt = box.querySelector('.pastePrompt');
  const vid = kind === 's' ? shadow.getElementById('s-video') : null;

  if (vid) { vid.pause(); vid.removeAttribute('srcObject'); vid.style.display = 'none'; stopCamera(); }
  prompt.style.display = 'none';
  img.src = blobOrFileUrl;
  img.style.display = 'block';
  del.style.display = 'inline-block';
}

function resetBox(kind) {
  const box = shadow.getElementById(`${kind}-box`);
  const img = shadow.getElementById(`${kind}-preview`);
  const del = shadow.getElementById(`${kind}-delete`);
  const prompt = box.querySelector('.pastePrompt');
  const vid = kind === 's' ? shadow.getElementById('s-video') : null;

  if (vid) { vid.pause(); vid.removeAttribute('srcObject'); vid.style.display = 'none'; stopCamera(); }
  img.removeAttribute('src');
  img.style.display = 'none';
  del.style.display = 'none';
  prompt.style.display = 'block';
  box.classList.remove('active');

  if (kind === 'g') garmentBlob = null;
  if (kind === 's') selfieBlob = null;
}

function fileToPreview(file, kind) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  showImageInBox(kind, url);
  if (kind === 'g') garmentBlob = file;
  if (kind === 's') selfieBlob = file;
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  // also hide Snap button
  shadow.getElementById('s-snap').style.display = 'none';
}

async function startCameraInSelfieBox() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const vid = shadow.getElementById('s-video');
    vid.srcObject = mediaStream;
    vid.style.display = 'block';
    // Clear any existing selfie image
    shadow.getElementById('s-preview').style.display = 'none';
    shadow.getElementById('s-delete').style.display = 'inline-block';
    shadow.getElementById('s-box').querySelector('.pastePrompt').style.display = 'none';
    shadow.getElementById('s-snap').style.display = 'inline-block';
  } catch {
    alert('Camera not available or permission denied.');
  }
}

function snapSelfie() {
  const vid = shadow.getElementById('s-video');
  if (!vid.srcObject) return;
  const c = document.createElement('canvas');
  c.width = vid.videoWidth || 640;
  c.height = vid.videoHeight || 480;
  const ctx = c.getContext('2d');
  ctx.drawImage(vid, 0, 0, c.width, c.height);
  c.toBlob(b => {
    if (!b) return;
    const url = URL.createObjectURL(b);
    selfieBlob = b;
    showImageInBox('s', url);
    stopCamera();                   // stop camera on Snap
  }, 'image/jpeg', 0.92);
}

function handlePaste(e) {
  const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  fileToPreview(file, activeBox);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

//////////////////// Wire UI ////////////////////
const panel = shadow.getElementById('vton-panel');

// open/close
shadow.getElementById('vton-tab').addEventListener('click', () => {
  // If this click came right after a drag, ignore it
  if (dragJustHappened) return;

  panel.classList.toggle('open');
  if (!panel.classList.contains('open')) stopCamera();
});
//shadow.getElementById('close').addEventListener('click', () => {
//  panel.classList.remove('open');
//  stopCamera();
//});

// vertical-only drag for tab and header (host stays pinned to RIGHT)
function enableVerticalDrag(el) {
  let startY = 0, startTop = 0, dragging = false, moved = false;

  const down = (e) => {
    dragging = true;
    moved = false;
    startY = e.clientY;
    startTop = host.getBoundingClientRect().top + window.scrollY;
    e.preventDefault();
  };

  const move = (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;

    // Treat it as a drag only if there is a noticeable movement
    if (Math.abs(dy) > 2) moved = true;

    const newTop = Math.max(0, startTop + dy);
    host.style.top = newTop + 'px';
    host.style.right = '0px';     // keep docked right
    host.style.left = 'auto';
  };

  const up = () => {
    if (dragging && moved) {
      // Mark that a drag just occurred so we can ignore the click
      dragJustHappened = true;
      // Reset after the click event lifecycle finishes
      setTimeout(() => { dragJustHappened = false; }, 0);
    }
    dragging = false;
  };

  el.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

enableVerticalDrag(shadow.getElementById('vton-tab'));
enableVerticalDrag(shadow.getElementById('vton-header'));

// select boxes
['g','s'].forEach(k => {
  const box = shadow.getElementById(`${k}-box`);
  box.addEventListener('click', () => setActive(k));
  box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('active'); });
  box.addEventListener('dragleave', () => box.classList.remove('active'));
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    setActive(k);
    const file = e.dataTransfer.files?.[0];
    fileToPreview(file, k);
  });
});
window.addEventListener('paste', handlePaste);

// Uploads
shadow.getElementById('g-upload').onclick = () => { setActive('g'); shadow.getElementById('g-file').click(); };
shadow.getElementById('s-upload').onclick = () => { setActive('s'); shadow.getElementById('s-file').click(); };
shadow.getElementById('g-file').addEventListener('change', (e) => fileToPreview(e.target.files[0], 'g'));

// Reverse image search for garment
const gReverseBtn = shadow.getElementById('g-reverse');

gReverseBtn.addEventListener('click', async () => {
  if (!garmentBlob) {
    alert('Please paste or upload a garment image first.');
    return;
  }

  try {
    gReverseBtn.disabled = true;
    const originalText = gReverseBtn.textContent;
    gReverseBtn.textContent = 'Searching…';

    const garmentDataUrl = await blobToDataUrl(garmentBlob);

    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'REVERSE_SEARCH_REQUEST',
          garmentDataUrl,
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(res);
          }
        }
      );
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || 'Unknown error from backend');
    }

    // Open Google reverse image search in a new tab
    window.open(response.googleUrl, '_blank');
  } catch (err) {
    console.error(err);
    alert('Could not start reverse image search. Please try again.');
  } finally {
    gReverseBtn.disabled = false;
    gReverseBtn.textContent = 'Find this garment on the web';
  }
});

shadow.getElementById('s-file').addEventListener('change', (e) => fileToPreview(e.target.files[0], 's'));

// Deletes
shadow.getElementById('g-delete').addEventListener('click', () => resetBox('g'));
shadow.getElementById('s-delete').addEventListener('click', () => resetBox('s'));

// Camera
shadow.getElementById('s-camera').addEventListener('click', () => { setActive('s'); startCameraInSelfieBox(); });
shadow.getElementById('s-snap').addEventListener('click', snapSelfie);

// Clear & Try-On
const resultImg = shadow.getElementById('result');

shadow.getElementById('clear').addEventListener('click', () => {
  resetBox('g'); resetBox('s');
  resultImg.style.display = 'none';
  resultImg.removeAttribute('src');
  panel.classList.remove('has-result');
  setStatus('');
});

shadow.getElementById('try').addEventListener('click', async () => {
  if (!garmentBlob || !selfieBlob) {
    alert('Please add both a garment image and a selfie.');
    return;
  }

  const btn = shadow.getElementById('try');
  const oldTxt = btn.textContent;
  btn.textContent = 'Processing…';
  btn.disabled = true;
  setStatus('Sending images to IDM-VTON… this can take a little while.');

  try {
    const [garmentDataUrl, selfieDataUrl] = await Promise.all([
      blobToDataUrl(garmentBlob),
      blobToDataUrl(selfieBlob)
    ]);

    // Wrap sendMessage in a Promise
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'TRY_ON_REQUEST',
          garmentDataUrl,
          selfieDataUrl
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(res);
          }
        }
      );
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || 'Unknown error from backend');
    }

    // Show the API result on the right without clearing the inputs
    resultImg.src = response.result;
    resultImg.style.display = 'block';
    panel.classList.add('has-result');
    setStatus('Done! You can adjust inputs and try again.');
  } catch (err) {
    console.error(err);
    alert('There was a problem running the virtual try-on. Falling back to mock image.');
    // fallback to mock for demo
    resultImg.src = chrome.runtime.getURL('assets/mock_result.png');
    resultImg.style.display = 'block';
    panel.classList.add('has-result');
    setStatus('Showing mock result due to an error from the backend.');
  } finally {
    btn.textContent = oldTxt;
    btn.disabled = false;
  }
});

// default active target
setActive('g');
