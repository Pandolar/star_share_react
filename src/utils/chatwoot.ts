import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN } from '../config/chatwoot';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../services/chatwootApi';

const CHATWOOT_SCRIPT_ID = 'chatwoot-sdk';
const GUEST_STORAGE_KEY = 'chatwoot_guest_identifier';

let initPromise: Promise<void> | null = null;
let hasRun = false;

const runChatwoot = () => {
  if (hasRun || !window.chatwootSDK?.run) {
    return;
  }
  window.chatwootSDK.run({
    websiteToken: CHATWOOT_WEBSITE_TOKEN,
    baseUrl: CHATWOOT_BASE_URL,
  });
  hasRun = true;
};

export const initChatwoot = (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    if (window.chatwootSDK?.run) {
      runChatwoot();
      resolve();
      return;
    }

    const existingScript = document.getElementById(CHATWOOT_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.chatwootSDK?.run) {
        runChatwoot();
        resolve();
      } else {
        existingScript.addEventListener('load', () => {
          runChatwoot();
          resolve();
        });
        existingScript.addEventListener('error', () => reject(new Error('Chatwoot SDK 加载失败')));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = CHATWOOT_SCRIPT_ID;
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => {
      runChatwoot();
      resolve();
    };
    script.onerror = () => reject(new Error('Chatwoot SDK 加载失败'));
    document.head.appendChild(script);
  });

  return initPromise;
};

const generateGuestIdentifier = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getGuestIdentifier = (): string => {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored && stored.startsWith('guest_')) {
      return stored;
    }
  } catch {
  }

  const identifier = generateGuestIdentifier();
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, identifier);
  } catch {
  }
  return identifier;
};

export const setChatwootGuest = async (): Promise<void> => {
  await initChatwoot();
  const identifier = getGuestIdentifier();
  const signature = await getChatwootGuestSignature(identifier);
  window.$chatwoot?.setUser?.(signature.identifier, {
    name: '游客',
    identifier_hash: signature.identifier_hash,
  });
};

export const setChatwootUser = async (): Promise<void> => {
  await initChatwoot();
  const signature = await getChatwootUserSignature();
  window.$chatwoot?.setUser?.(signature.identifier, {
    name: signature.name,
    email: signature.email,
    identifier_hash: signature.identifier_hash,
  });
};

export const resetChatwoot = (): void => {
  window.$chatwoot?.reset?.();
};
