/**
 * URL 参数工具函数
 */

/**
 * 获取 URL 参数值
 */
export const getQueryParam = (name: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

/**
 * 获取所有 URL 参数
 */
export const getAllQueryParams = (): Record<string, string> => {
  const urlParams = new URLSearchParams(window.location.search);
  const params: Record<string, string> = {};
  
  urlParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
};

/**
 * 设置 URL 参数
 */
export const setQueryParam = (name: string, value: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.pushState({}, '', url.toString());
};

/**
 * 删除 URL 参数
 */
export const removeQueryParam = (name: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.pushState({}, '', url.toString());
}; 