import { useEffect } from 'react';

const SCRIPT_ID = 'xenoai-chatbot-embed';
const SCRIPT_SRC = 'https://widget.xenoai.vn/sdk/chatbot-embed.js';
const PUBLIC_KEY = 'pk_live_xwnQoweZoAP52YptlzcO9KRPmwpwNQ9rgvaZw6iwt5o';
const API_URL = 'https://widget.xenoai.vn';

function XenoChatbotEmbed() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.setAttribute('data-public-key', PUBLIC_KEY);
    script.setAttribute('data-api-url', API_URL);
    script.setAttribute('data-stream', 'true');
    document.head.appendChild(script);
  }, []);

  return null;
}

export default XenoChatbotEmbed;
