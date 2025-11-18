// background.js 

const TRYON_ENDPOINT = "https://tryme-backend-fapp.onrender.com/tryon";


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TRY_ON_REQUEST") {
    handleTryOn(msg)
      .then((resultDataUrl) => {
        sendResponse({ ok: true, result: resultDataUrl });
      })
      .catch((err) => {
        console.error("TryOn error:", err);
        sendResponse({ ok: false, error: String(err) });
      });

    // Tell Chrome this is async
    return true;
  }
});

// msg = { selfieDataUrl, garmentDataUrl }
async function handleTryOn({ selfieDataUrl, garmentDataUrl }) {
  const res = await fetch(TRYON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      selfieDataUrl,
      garmentDataUrl
    })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from backend`);
  }

  const json = await res.json();

  if (!json.ok || !json.result) {
    throw new Error(json.error || "Backend returned no result");
  }

  // This should be a data:image/...;base64,... string from your server
  return json.result;
}