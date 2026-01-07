/**
 * Chatwoot 请求管理器
 * 确保全局只有一个签名请求在进行，防止并发导致 429
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class ChatwootRequestManager {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestHistory: Array<{ key: string; timestamp: number }> = [];
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2秒
  private readonly HISTORY_SIZE = 10;

  /**
   * 执行请求，确保同一 key 不会并发执行
   */
  async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // 检查是否有相同的请求正在进行
    const pending = this.pendingRequests.get(key);
    if (pending) {
      const age = Date.now() - pending.timestamp;
      console.log(`[Chatwoot Manager] 复用进行中的请求: ${key}, 已等待 ${age}ms`);
      return pending.promise;
    }

    // 检查请求频率
    const lastRequest = this.requestHistory
      .filter(h => h.key === key)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest.timestamp;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(
          `[Chatwoot Manager] 请求过于频繁，等待 ${waitTime}ms: ${key}`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // 创建新请求
    console.log(`[Chatwoot Manager] 开始新请求: ${key}`);
    const promise = requestFn()
      .then(result => {
        console.log(`[Chatwoot Manager] 请求成功: ${key}`);
        return result;
      })
      .catch(error => {
        console.error(`[Chatwoot Manager] 请求失败: ${key}`, error);
        throw error;
      })
      .finally(() => {
        // 清理
        this.pendingRequests.delete(key);
        this.addToHistory(key);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  private addToHistory(key: string) {
    this.requestHistory.push({ key, timestamp: Date.now() });
    if (this.requestHistory.length > this.HISTORY_SIZE) {
      this.requestHistory.shift();
    }
  }

  /**
   * 获取请求统计信息
   */
  getStats() {
    return {
      pendingCount: this.pendingRequests.size,
      historyCount: this.requestHistory.length,
      recentRequests: this.requestHistory.slice(-5),
    };
  }

  /**
   * 清理所有待处理的请求
   */
  clear() {
    this.pendingRequests.clear();
    this.requestHistory = [];
  }
}

export const chatwootRequestManager = new ChatwootRequestManager();
