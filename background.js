// background.js — will call Hugging Face IDM-VTON

const HF_ENDPOINT = '';

const HF_TOKEN = ''; 

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRY_ON_REQUEST') {
    // msg will contain garment + selfie data 
    handleTryOn(msg)
      .then(resultUrlOrData => sendResponse({ ok: true, result: resultUrlOrData }))
      .catch(err => {
        console.error('IDM-VTON error:', err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // keep channel open for async response
  }
});

// TODO: implement the Hugging Face call here.
async function handleTryOn({ garmentImage, selfieImage }) {
  // Build request body
  // const res = await fetch(HF_ENDPOINT, { ... });
  // return URL or data to be shown in <img id="result"> in content.js.
  return null;
}
