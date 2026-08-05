const COOKIE_NAME = "state_less_memory_v1";
const PERSISTENT_DAYS = 7;
const ALLOWED_ENDINGS = new Set(["verified", "unstable"]);
const ALLOWED_POLICIES = new Set(["session", "persistent"]);

export const EMPTY_MEMORY = Object.freeze({
  version: 2,
  visits: 0,
  runs: 0,
  bestScore: 0,
  lastEnding: null,
  policy: null,
  fragments: 0,
});

function integerInRange(value, minimum, maximum) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : minimum;
}

export function sanitizeMemory(value) {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_MEMORY };
  }

  return {
    version: 2,
    visits: integerInRange(value.visits, 0, 999),
    runs: integerInRange(value.runs, 0, 999),
    bestScore: integerInRange(value.bestScore, 0, 999_999),
    lastEnding: ALLOWED_ENDINGS.has(value.lastEnding) ? value.lastEnding : null,
    policy: ALLOWED_POLICIES.has(value.policy) ? value.policy : null,
    fragments: integerInRange(value.fragments, 0, 6),
  };
}

export function encodeMemory(memory) {
  return encodeURIComponent(JSON.stringify(sanitizeMemory(memory)));
}

export function decodeMemory(value) {
  if (!value) return { ...EMPTY_MEMORY };
  try {
    return sanitizeMemory(JSON.parse(decodeURIComponent(value)));
  } catch {
    return { ...EMPTY_MEMORY };
  }
}

export function readCookieValue(cookieHeader, name = COOKIE_NAME) {
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function getCookiePath() {
  const pathname = new URL("./", document.baseURI).pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function cookieStoreAvailable() {
  return window.isSecureContext && "cookieStore" in window;
}

export async function loadMemory() {
  if (cookieStoreAvailable()) {
    try {
      const item = await window.cookieStore.get(COOKIE_NAME);
      return {
        memory: decodeMemory(item?.value),
        found: Boolean(item),
        adapter: "COOKIE STORE API",
      };
    } catch {
      // A strict browser policy can reject Cookie Store access. The synchronous
      // fallback keeps the static GitHub Pages build playable.
    }
  }

  const value = readCookieValue(document.cookie);
  return {
    memory: decodeMemory(value),
    found: Boolean(value),
    adapter: "DOCUMENT.COOKIE FALLBACK",
  };
}

export async function saveMemory(memory) {
  const cleanMemory = sanitizeMemory(memory);
  const value = encodeMemory(cleanMemory);
  const path = getCookiePath();
  const expires = cleanMemory.policy === "persistent"
    ? Date.now() + PERSISTENT_DAYS * 24 * 60 * 60 * 1_000
    : undefined;

  if (cookieStoreAvailable()) {
    try {
      const options = {
        name: COOKIE_NAME,
        value,
        path,
        sameSite: "strict",
      };
      if (expires) options.expires = expires;
      await window.cookieStore.set(options);
      return "COOKIE STORE API";
    } catch {
      // Continue with the interoperable fallback below.
    }
  }

  const attributes = [
    `${COOKIE_NAME}=${value}`,
    `Path=${path}`,
    "SameSite=Strict",
  ];
  if (expires) attributes.push(`Expires=${new Date(expires).toUTCString()}`);
  if (location.protocol === "https:") attributes.push("Secure");
  document.cookie = attributes.join("; ");
  return "DOCUMENT.COOKIE FALLBACK";
}

export async function clearMemory() {
  const path = getCookiePath();
  if (cookieStoreAvailable()) {
    try {
      await window.cookieStore.delete({ name: COOKIE_NAME, path });
      return "COOKIE STORE API";
    } catch {
      // Continue with the fallback below.
    }
  }

  document.cookie = `${COOKIE_NAME}=; Path=${path}; Max-Age=0; SameSite=Strict`;
  return "DOCUMENT.COOKIE FALLBACK";
}

export function observeMemoryChanges(callback) {
  if (!cookieStoreAvailable()) return () => {};

  const listener = (event) => {
    const changed = [...event.changed, ...event.deleted]
      .some((item) => item.name === COOKIE_NAME);
    if (changed) callback();
  };
  window.cookieStore.addEventListener("change", listener);
  return () => window.cookieStore.removeEventListener("change", listener);
}
