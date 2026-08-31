const MAX_BYTES = 25 * 1024 * 1024;

function response(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function safeFilename(value) {
  try {
    return decodeURIComponent(value || 'lecture-recording.webm').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
  } catch (_) {
    return 'lecture-recording.webm';
  }
}

export const onRequestPost = async ({ request, env }) => {
  if (!env.OPENAI_API_KEY) return response({ error: 'TRANSCRIPTION_NOT_CONFIGURED' }, 503);
  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  const allowed = /^(audio|video)\/(mpeg|mp4|wav|webm|ogg|quicktime|x-m4a|m4a)$/i.test(contentType.split(';')[0]);
  if (!allowed) return response({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_BYTES) return response({ error: 'MEDIA_FILE_TOO_LARGE' }, 413);

  try {
    const media = await request.arrayBuffer();
    if (!media.byteLength) return response({ error: 'EMPTY_MEDIA_FILE' }, 400);
    if (media.byteLength > MAX_BYTES) return response({ error: 'MEDIA_FILE_TOO_LARGE' }, 413);
    const form = new FormData();
    form.append('file', new Blob([media], { type: contentType }), safeFilename(request.headers.get('x-filename')));
    form.append('model', env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe');
    const language = String(request.headers.get('x-transcription-language') || '').trim();
    if (/^[a-z]{2,3}$/i.test(language)) form.append('language', language);
    form.append('prompt', 'This is a lecture. Preserve technical terms, names, formulas, and spoken section headings accurately.');
    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return response({ error: 'TRANSCRIPTION_FAILED' }, 502);
    return response({ text: payload.text || '' });
  } catch (error) {
    console.log('Transcription request failed:', error.message);
    return response({ error: 'TRANSCRIPTION_FAILED' }, 502);
  }
};
