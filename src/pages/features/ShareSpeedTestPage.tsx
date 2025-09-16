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

                const fastest = finalResults
                    .filter(r => r.success)
                    .sort((a, b) => a.durationMs - b.durationMs)[0];

                if (!fastest) {
                    setErrorText('没有可用的节点');
                    setStatusText('无法完成测速');
                    return;
                }

                if (!hasRedirectedRef.current) {
                    hasRedirectedRef.current = true;
                    const fastestIndex = finalResults.findIndex(r => r.node === fastest.node);
                    setStatusText(`正在跳转至最优节点（节点${fastestIndex + 1}）...`);
                    // 直接跳转到该节点域名（保留 https 前缀）；
                    const url = toHttpsUrl(fastest.node);
                    window.location.replace(url);
                }
            } catch (err: any) {
                setErrorText(err?.message || '测速过程发生错误');
                setStatusText('无法完成测速');
            }
        };

        fetchNodesAndTest();
        // 不需要清理；若用户离开页面，导航会中止
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
                                        <div className="text-xs tabular-nums text-gray-700">
                                            {r.status === 'pending' ? '测试中…' : `${Math.round(r.durationMs)} ms`}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-xs text-gray-500">完成后将自动跳转至最快可用节点</p>
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
        const url = `${base.replace(/\/$/, '')}/client-api/info`;
        const resp = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (resp.ok) {
            try {
                await resp.clone().json();
                success = true;
            } catch (_) {
                success = false;
            }
        } else {
            success = false;
        }
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


