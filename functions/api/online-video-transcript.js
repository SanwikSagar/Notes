function response(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function youtubeIdFromUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      return match ? match[1] : null;
    }
  } catch (_) {}
  return null;
}

function jsonObjectAfter(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return null;
  const open = source.indexOf('{', start + marker.length);
  if (open === -1) return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(source.slice(open, index + 1)); } catch (_) { return null; }
      }
    }
  }
  return null;
}

function decodeEntities(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ').trim();
}

async function fetchYouTubeCaptions(videoId) {
  const watch = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  });
  if (!watch.ok) throw new Error(`WATCH_PAGE_HTTP_${watch.status}`);
  const html = await watch.text();
  const player = jsonObjectAfter(html, 'ytInitialPlayerResponse') || jsonObjectAfter(html, 'var ytInitialPlayerResponse =');
  const tracks = player && player.captions && player.captions.playerCaptionsTracklistRenderer && player.captions.playerCaptionsTracklistRenderer.captionTracks;
  if (!Array.isArray(tracks) || !tracks.length) return null;
  const preferred = tracks.find((track) => track.languageCode === 'en') || tracks[0];
  const captionResponse = await fetch(`${preferred.baseUrl}&fmt=srv3`);
  if (!captionResponse.ok) throw new Error(`CAPTION_TRACK_HTTP_${captionResponse.status}`);
  const xml = await captionResponse.text();
  const parts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((match) => decodeEntities(match[1])).filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const onRequestPost = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const videoId = youtubeIdFromUrl(body.url);
  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return response({ error: 'UNSUPPORTED_VIDEO_HOST' }, 400);
  try {
    const text = await fetchYouTubeCaptions(videoId);
    if (!text) return response({ error: 'NO_CAPTIONS_FOUND' }, 404);
    return response({ title: `YouTube lecture ${videoId}`, text });
  } catch (error) {
    console.log('YouTube caption retrieval failed:', error.message);
    return response({ error: 'CAPTION_SERVICE_UNAVAILABLE' }, 502);
  }
};
