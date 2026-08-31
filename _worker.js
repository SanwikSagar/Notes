import { onRequestGet as health } from './functions/api/health.js';
import { onRequestPost as onlineVideoTranscript } from './functions/api/online-video-transcript.js';
import { onRequestPost as transcribe } from './functions/api/transcribe.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let handler;
    if (url.pathname === '/api/health' && request.method === 'GET') handler = health;
    else if (url.pathname === '/api/online-video-transcript' && request.method === 'POST') handler = onlineVideoTranscript;
    else if (url.pathname === '/api/transcribe' && request.method === 'POST') handler = transcribe;

    if (handler) return handler({ request, env, ctx });
    return env.ASSETS.fetch(request);
  }
};
