// SSRF protection for serverless functions that fetch user-supplied URLs.
import dns from 'dns';
import net from 'net';

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::' || l === '::1') return true;
    if (l.startsWith('::ffff:')) {
      const v4 = l.slice(7);
      return net.isIPv4(v4) ? isPrivateIp(v4) : true;
    }
    return l.startsWith('fc') || l.startsWith('fd') || /^fe[89ab]/.test(l);
  }
  return true;
}

export async function assertPublicHost(hostname) {
  const host = String(hostname).replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Blocked host');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked private IP');
    return;
  }
  const addrs = await dns.promises.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('Blocked private network address');
}

// fetch() that validates DNS + every redirect hop, with a timeout.
export async function safeFetch(urlStr, init = {}, maxHops = 4, timeoutMs = 10000) {
  let current = String(urlStr).trim();
  if (!/^https?:\/\//i.test(current)) current = `https://${current}`;
  for (let hop = 0; hop <= maxHops; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Blocked protocol');
    await assertPublicHost(parsed.hostname);
    const resp = await fetch(parsed.toString(), { ...init, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
      current = new URL(resp.headers.get('location'), parsed).toString();
      continue;
    }
    return resp;
  }
  throw new Error('Too many redirects');
}
