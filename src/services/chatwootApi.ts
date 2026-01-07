interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

class ApiError extends Error {
  status: number;
  response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const status = response.status;
    let message = `HTTP Error: ${status}`;

    // 特殊处理 429 错误
    if (status === 429) {
      message = '请求过于频繁，请稍后再试';
    }

    try {
      const text = await response.text();
      if (text) {
        message += ` - ${text}`;
      }
    } catch {
      // 忽略解析错误
    }

    throw new ApiError(message, status);
  }

  const payload: ApiResponse<T> = await response.json();
  if (payload.code !== 20000) {
    throw new ApiError(payload.msg || '请求失败', 500, payload);
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
