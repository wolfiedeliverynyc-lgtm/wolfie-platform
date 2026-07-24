const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://wolfie-backend-pt9u.onrender.com')
  .replace(/\/api\/v1\/?$/, '')
  .replace(/\/+$/, '');

export function sanitizeImageUrl(url: string | null | undefined, fallback: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const trimmed = url.trim();

  // Replace localhost:5000 / 127.0.0.1:5000 URLs coming from backend with production backend host
  if (trimmed.includes('localhost:5000') || trimmed.includes('127.0.0.1:5000')) {
    return trimmed.replace(/https?:\/\/(localhost|127\.0\.0\.1):5000/, BACKEND_BASE);
  }

  // Prepend backend URL if relative upload path
  if (trimmed.startsWith('/uploads/')) {
    return `${BACKEND_BASE}${trimmed}`;
  }

  return trimmed;
}

export function handleImageError(event: React.SyntheticEvent<HTMLImageElement, Event>, fallback: string) {
  const target = event.currentTarget;
  if (target.src !== fallback && !target.src.endsWith(fallback)) {
    target.src = fallback;
  }
}
