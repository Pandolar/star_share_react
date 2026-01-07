import React, { useEffect, useMemo, useState } from 'react';
import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN } from '../../config/chatwoot';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../../services/chatwootApi';
import { getCookie } from '../../utils/cookies';

const GUEST_STORAGE_KEY = 'chatwoot_guest_identifier';

type EmbedMode = 'auto' | 'guest' | 'user';

interface ChatwootEmbedProps {
  mode?: EmbedMode;
  height?: number;
}

const buildWidgetUrl = (identifier: string, identifierHash: string): string => {
  const params = new URLSearchParams({
    website_token: CHATWOOT_WEBSITE_TOKEN,
    identifier,
    identifier_hash: identifierHash,
  });
  return `${CHATWOOT_BASE_URL}/widget?${params.toString()}`;
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

const isLoggedIn = (): boolean => {
  const xuserid = getCookie('xuserid');
  const xtoken = getCookie('xtoken');
  const xyUuidToken = getCookie('xy_uuid_token');
  return !!(xuserid && xtoken && xyUuidToken);
};

export const ChatwootEmbed: React.FC<ChatwootEmbedProps> = ({ mode = 'auto', height = 620 }) => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const desiredMode = useMemo(() => {
    if (mode === 'auto') {
      return isLoggedIn() ? 'user' : 'guest';
    }
    return mode;
  }, [mode]);

  useEffect(() => {
    let isCancelled = false;

    const loadSignature = async () => {
      setErrorMessage('');
      setIframeUrl(null);
      try {
        if (desiredMode === 'user') {
          const signature = await getChatwootUserSignature();
          if (!isCancelled) {
            setIframeUrl(buildWidgetUrl(signature.identifier, signature.identifier_hash));
          }
          return;
        }

        const guestIdentifier = getGuestIdentifier();
        const signature = await getChatwootGuestSignature(guestIdentifier);
        if (!isCancelled) {
          setIframeUrl(buildWidgetUrl(signature.identifier, signature.identifier_hash));
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage('客服加载失败，请稍后再试');
        }
      }
    };

    loadSignature();

    return () => {
      isCancelled = true;
    };
  }, [desiredMode]);

  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        {errorMessage}
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        正在加载客服...
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
      <iframe
        title="在线客服"
        src={iframeUrl}
        className="w-full"
        style={{ height }}
        frameBorder={0}
        allow="microphone; camera"
      />
    </div>
  );
};
