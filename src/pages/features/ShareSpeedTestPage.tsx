import React, { useEffect, useMemo, useRef, useState } from 'react';
import SEOHead from '../../components/SEOHead';

type SpeedTestResult = {
    node: string;
    success: boolean;
    durationMs: number;
    status: 'pending' | 'success' | 'fail';
};

const SPEEDTEST_TIMEOUT_MS = 3000;

const ShareSpeedTestPage: React.FC = () => {
    const [statusText, setStatusText] = useState<string>('正在获取可用节点...');
    const [progressText, setProgressText] = useState<string>('');
    const [errorText, setErrorText] = useState<string>('');
    const [results, setResults] = useState<SpeedTestResult[]>([]);
    const [nodes, setNodes] = useState<string[]>([]);
    const hasRedirectedRef = useRef<boolean>(false);
    const autoTimerRef = useRef<number | null>(null);

    const seoConfig = useMemo(() => ({
        title: '请稍后...',
        description: '为您自动测试最优节点并跳转，通常耗时数秒。',
        noindex: true
    }), []);

    useEffect(() => {
        const fetchNodesAndTest = async () => {
            try {
                setStatusText('正在获取可用节点...');
                const resp = await fetch('/u/get_speedtest_url', { credentials: 'include' });
                if (!resp.ok) {
                    throw new Error(`获取节点失败: ${resp.status}`);
                }
                const data = await resp.json();
                const fetchedNodes: string[] = Array.isArray(data?.data) ? data.data : [];

                if (fetchedNodes.length === 0) {
                    throw new Error('未获取到任何节点');
                }
                setNodes(fetchedNodes);

                setStatusText('正在并行测试节点速度...');

                // 初始化 pending 结果以呈现“节点1~N”
                setResults(fetchedNodes.map((n) => ({
                    node: n,
                    success: false,
                    durationMs: 0,
                    status: 'pending'
                })));

                // 并行测试并逐项更新 UI
                const testPromises = fetchedNodes.map((node, index) =>
                    testNode(node).then((r) => {
                        setResults((prev) => {
                            const copy = [...prev];
                            copy[index] = {
                                node: r.node,
                                success: r.success,
                                durationMs: r.durationMs,
                                status: r.success ? 'success' : 'fail'
                            };
                            return copy;
                        });
                        return { index, ...r };
                    })
                );

                const finished = await Promise.all(testPromises);

                const finalResults: SpeedTestResult[] = finished
                    .sort((a, b) => a.index - b.index)
                    .map(({ node, success, durationMs }) => ({
                        node,
                        success,
                        durationMs,
                        status: success ? 'success' : 'fail'
                    }));

                setProgressText(`共 ${fetchedNodes.length} 个节点，成功 ${finalResults.filter(v => v.success).length} 个`);

                // 仅保留成功节点
                const successful = finalResults.filter(r => r.success);

                if (successful.length === 0) {
                    setErrorText('没有可用的节点');
                    setStatusText('无法完成测速');
                    return;
                }
                // 只有一个可用节点：直接跳转
                if (successful.length === 1) {
                    if (!hasRedirectedRef.current) {
                        hasRedirectedRef.current = true;
                        const onlyIndex = finalResults.findIndex(r => r.node === successful[0].node);
                        setStatusText(`正在跳转至可用节点（节点${onlyIndex + 1}）...`);
                        const nodeUrl = toHttpsUrl(successful[0].node);
                        const fromUrl = `${nodeUrl}/home`;
                        const encodedFromUrl = encodeURIComponent(fromUrl);
                        //const redirectUrl = `/login?fromurl=${encodedFromUrl}`;
                        window.location.replace(fromUrl);
                    }
                    return;
                }

                // 计算平均延迟（成功节点）
                const avg = successful.reduce((sum, r) => sum + r.durationMs, 0) / successful.length;
                // 过滤掉高于平均值 20% 的节点
                const threshold = avg * 1.2;
                const candidates = successful.filter(r => r.durationMs <= threshold);

                // 候选至少有一个（数学上必然 >=1），但做个兜底
                const pool = candidates.length > 0 ? candidates : successful;

                // 展示完成提示，并在 2 秒后自动跳转（若期间用户未手动点击）
                setStatusText('测速完成，2秒后自动跳转至优选节点…');

                autoTimerRef.current = window.setTimeout(() => {
                    if (hasRedirectedRef.current) return;
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    const pickIndex = finalResults.findIndex(r => r.node === pick.node);
                    setStatusText(`正在跳转至优选节点（节点${pickIndex + 1}）...`);
                    const nodeUrl = toHttpsUrl(pick.node);
                    const fromUrl = `${nodeUrl}/home`;
                    const encodedFromUrl = encodeURIComponent(fromUrl);
                    const redirectUrl = `/login?fromurl=${encodedFromUrl}`;
                    window.location.replace(redirectUrl);
                }, 2000);

            } catch (err: any) {
                setErrorText(err?.message || '测速过程发生错误');
                setStatusText('无法完成测速');
            }
        };

        fetchNodesAndTest();
        return () => {
            if (autoTimerRef.current) {
                clearTimeout(autoTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
            <SEOHead config={seoConfig} />

            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center">
                    <Spinner />
                    <h1 className="mt-4 text-xl font-semibold text-gray-900">优选最佳线路中</h1>
                    <p className="mt-2 text-sm text-gray-600">{statusText}</p>
                    <p className="mt-1 text-xs text-gray-500">{progressText || (nodes.length > 0 ? `共 ${nodes.length} 个节点` : '')}</p>
                    {errorText && (
                        <div className="mt-3 text-red-600 text-sm">{errorText}</div>
                    )}

                    {results.length > 0 && (
                        <div className="mt-6 w-full">
                            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                                {results.map((r, i) => (
                                    <li key={`${r.node}`} className="flex items-center justify-between px-3 py-2 bg-white">
                                        <div className="text-left">
                                            <div className="text-sm font-medium text-gray-900 truncate">{`节点${i + 1}`}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-xs tabular-nums text-gray-700 min-w-[88px] text-right">
                                                {r.status === 'pending' ? '测试中…' : (r.success ? `${(r.durationMs / 1000).toFixed(3)} 秒` : '超时')}
                                            </div>
                                            <button
                                                className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-blue-600 disabled:text-gray-400 disabled:border-gray-100"
                                                onClick={() => {
                                                    if (hasRedirectedRef.current) return;
                                                    // 用户手动点击则立即跳转并取消自动跳转
                                                    hasRedirectedRef.current = true;
                                                    if (autoTimerRef.current) {
                                                        clearTimeout(autoTimerRef.current);
                                                        autoTimerRef.current = null;
                                                    }
                                                    setStatusText(`正在跳转至节点（节点${i + 1}）...`);
                                                    const nodeUrl = toHttpsUrl(r.node);
                                                    const fromUrl = `${nodeUrl}/home`;
                                                    const encodedFromUrl = encodeURIComponent(fromUrl);
                                                    const redirectUrl = `/login?fromurl=${encodedFromUrl}`;
                                                    window.location.replace(redirectUrl);
                                                }}
                                                aria-label={`直达节点${i + 1}`}
                                            >
                                                直达
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-xs text-gray-500">即将自动跳转至优选节点</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function toHttpsUrl(node: string): string {
    // 允许节点已包含协议，若无则补全 https://
    const hasProtocol = /^https?:\/\//i.test(node);
    const url = hasProtocol ? node : `https://${node}`;
    return url;
}

async function testNode(node: string): Promise<SpeedTestResult> {
    const start = performance.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SPEEDTEST_TIMEOUT_MS);

    let success = false;
    try {
        const base = toHttpsUrl(node);
        const url = `${base.replace(/\/$/, '')}/ces/v1/projects/oai/settings`;
        const resp = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        // ✅ 只要状态码是 200 就算成功
        success = resp.status === 200;
    } catch (_) {
        success = false;
    } finally {
        clearTimeout(timeout);
    }

    const end = performance.now();
    return {
        node,
        success,
        durationMs: end - start,
        status: success ? 'success' : 'fail'
    };
}

const Spinner: React.FC = () => (
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" aria-label="loading" />
);

export default ShareSpeedTestPage;
