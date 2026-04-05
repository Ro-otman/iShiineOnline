export function parseCookieHeader(header = '') {
  const source = String(header || '').trim();
  if (!source) return {};

  return source.split(/;\s*/).reduce((accumulator, part) => {
    if (!part) return accumulator;
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) return accumulator;

    const key = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();

    try {
      accumulator[key] = decodeURIComponent(rawValue);
    } catch {
      accumulator[key] = rawValue;
    }

    return accumulator;
  }, {});
}

export function parseRequestCookies(req) {
  return parseCookieHeader(req?.headers?.cookie || '');
}
