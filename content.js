// content.js — Right-docked, vertical-only drag. Paste/Upload previews in-box with Delete.
// Selfie camera appears in its paste box; Snap stops the camera.

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
    position: absolute; left: -40px; top: 0;
    width: 40px; height: 120px;
    background: #111; color: #fff;
    border-radius: 8px 0 0 8px;
    display: flex; align-items: center; justify-content: center;
    font: 600 12px system-ui;
    cursor: ns-resize; user-select: none;
  }

  .panel {
    width: 340px;
    background: #fff; color: #111;
    border: 1px solid #ddd; border-right: none;       /* open to page on the left */
    border-radius: 8px 0 0 8px;
    box-shadow: 0 6px 24px rgba(0,0,0,.18);
    font: 400 13px system-ui;
    display: none;
    position: relative;
  }
  .panel.open { display: block; }

  .header {
    padding: 8px 10px;
    background:#f6f7f9;
    border-bottom:1px solid #eee;
    display:flex; align-items:center; justify-content: space-between;
    font-weight:600; cursor: ns-resize;               /* vertical drag */
    border-radius: 8px 0 0 0;
  }

  .body { padding: 12px; }
  .row { margin-bottom: 12px; }

  .pasteBox {
    position: relative;
    border: 2px dashed #bbb; border-radius: 10px;
    padding: 12px; min-height: 120px;
    display:flex; align-items:center; justify-content:center;
    text-align:center; color:#555; background:#fafafa;
    transition: border-color .15s, background .15s, box-shadow .15s;
    outline: none;
  }
  .pasteBox.active {
    border-color:#111; background:#fff;
    box-shadow: 0 0 0 3px rgba(0,0,0,.08) inset;
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
  .result { width:100%; border-radius:10px; margin-top:10px; display:none; }
`;
shadow.appendChild(style);

//////////////////// Markup ////////////////////
const ui = document.createElement('div');
ui.innerHTML = `
  <div class="panel" id="vton-panel">
    <div class="header" id="vton-header">
      <span>Virtual Try-On</span>
      <button id="close" class="secondary">Close</button>
    </div>
    <div class="body">
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
        <button id="try" style="flex:1">Try On (Mock)</button>
        <button id="clear" class="secondary">Clear</button>
      </div>

      <img id="result" class="result" alt="Result">
    </div>
  </div>

  <div class="tab" id="vton-tab" title="Drag up/down • Click to open">TRY</div>
`;
shadow.appendChild(ui);

//////////////////// State ////////////////////
let activeBox = 'g';    // 'g' or 's'
let mediaStream = null;

//////////////////// Helpers ////////////////////
function setActive(which) {
  activeBox = which;
  ['g-box','s-box'].forEach(id => shadow.getElementById(id).classList.remove('active'));
  shadow.getElementById(`${which}-box`).classList.add('active');
  shadow.getElementById(`${which}-box`).focus();
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
}

function fileToPreview(file, kind) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  showImageInBox(kind, url);
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
    const url = URL.createObjectURL(b);
    showImageInBox('s', url);
    stopCamera();                   // stop camera on Snap (as requested)
  }, 'image/jpeg', 0.92);
}

function handlePaste(e) {
  const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  fileToPreview(file, activeBox);
}

//////////////////// Wire UI ////////////////////
const panel = shadow.getElementById('vton-panel');

// open/close
shadow.getElementById('vton-tab').addEventListener('click', () => {
  panel.classList.toggle('open');
  if (!panel.classList.contains('open')) stopCamera();
});
shadow.getElementById('close').addEventListener('click', () => {
  panel.classList.remove('open');
  stopCamera();
});

// vertical-only drag for tab and header (host stays pinned to RIGHT)
function enableVerticalDrag(el) {
  let startY = 0, startTop = 0, dragging = false;

  const down = (e) => {
    dragging = true;
    startY = e.clientY;
    startTop = host.getBoundingClientRect().top + window.scrollY;
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const newTop = Math.max(0, startTop + dy);
    host.style.top = newTop + 'px';
    host.style.right = '0px';     // keep docked right
    host.style.left = 'auto';
  };
  const up = () => { dragging = false; };

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
shadow.getElementById('s-file').addEventListener('change', (e) => fileToPreview(e.target.files[0], 's'));

// Deletes
shadow.getElementById('g-delete').addEventListener('click', () => resetBox('g'));
shadow.getElementById('s-delete').addEventListener('click', () => resetBox('s'));

// Camera
shadow.getElementById('s-camera').addEventListener('click', () => { setActive('s'); startCameraInSelfieBox(); });
shadow.getElementById('s-snap').addEventListener('click', snapSelfie);

// Clear & Mock Try-On
shadow.getElementById('clear').addEventListener('click', () => {
  resetBox('g'); resetBox('s');
  shadow.getElementById('result').style.display = 'none';
});
shadow.getElementById('try').addEventListener('click', async () => {
  const g = shadow.getElementById('g-preview').src;
  const s = shadow.getElementById('s-preview').src || shadow.getElementById('s-video').srcObject;
  if (!g || !s) { alert('Please add both a garment image and a selfie.'); return; }

  const btn = shadow.getElementById('try');
  const oldTxt = btn.textContent; btn.textContent = 'Processing…'; btn.disabled = true;
  await new Promise(r => setTimeout(r, 700));
  btn.textContent = oldTxt; btn.disabled = false;

  const result = shadow.getElementById('result');
  result.src = chrome.runtime.getURL('assets/mock_result.jpg');
  result.style.display = 'block';
});

// default active target
setActive('g');
