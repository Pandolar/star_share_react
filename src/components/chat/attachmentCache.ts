import { getCookie } from '../../utils/cookies';

export function buildAttachmentUrl(scope: 'user' | 'admin', attachmentId: string): string {
  return `${scope === 'user' ? '/u' : '/star'}/cs_attachment/${encodeURIComponent(attachmentId)}`;
}

export async function fetchAttachmentBlob(url: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  if (url.startsWith('/star/')) {
    let token = localStorage.getItem('admin_token');
    if (!token) {
      const prefix = 'admin_token=';
      const cookie = decodeURIComponent(document.cookie || '')
        .split(';')
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));
      token = cookie ? cookie.slice(prefix.length) : null;
    }
    if (token) headers.admin_token = token;
  } else {
    const xuserid = getCookie('xuserid');
    const xtoken = getCookie('xtoken');
    if (xuserid) headers.xuserid = xuserid;
    if (xtoken) headers.xtoken = xtoken;
  }
  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`附件加载失败：${response.status}`);
  return response.blob();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
