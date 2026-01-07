interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  const payload: ApiResponse<T> = await response.json();
  if (payload.code !== 20000) {
    throw new Error(payload.msg || '请求失败');
  }
  return payload.data;
};

export const getChatwootGuestSignature = async (identifier: string): Promise<{
  identifier: string;
  identifier_hash: string;
}> => {
  const response = await fetch(
    `/u/chatwoot_guest_signature?identifier=${encodeURIComponent(identifier)}`,
    { method: 'GET', credentials: 'include' }
  );
  return parseResponse(response);
};

export const getChatwootUserSignature = async (): Promise<{
  identifier: string;
  identifier_hash: string;
  name?: string;
  email?: string;
}> => {
  const response = await fetch('/u/chatwoot_user_signature', {
    method: 'GET',
    credentials: 'include',
  });
  return parseResponse(response);
};
