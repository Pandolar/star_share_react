import React, { useEffect, useMemo, useRef, useState } from 'react';
import SEOHead from '../../components/SEOHead';

type NodeInfo = {
    url: string;
    weight: number;
    isPrimary: boolean;
};

type SpeedTestResult = {
    node: string;
    weight: number;
    isPrimary: boolean;
    success: boolean;
    durationMs: number;
    status: 'pending' | 'success' | 'fail';
};

type TestResult = {
    node: string;
    weight: number;
    isPrimary: boolean;
    success: boolean;
    durationMs: number;
    status: 'pending' | 'success' | 'fail';
};

const SPEEDTEST_TIMEOUT_MS = 3000;

const ShareSpeedTestPage: React.FC = () => {
    const [statusText, setStatusText] = useState<string>('正在获取可用节点...');
    const [errorText, setErrorText] = useState<string>('');
    const [results, setResults] = useState<SpeedTestResult[]>([]);
    const [nodes, setNodes] = useState<NodeInfo[]>([]);
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
                const fetchedNodes = normalizeNodes(extractRawNodes(data?.data));

                if (fetchedNodes.length === 0) {
                    throw new Error('未获取到任何节点');
                }
                setNodes(fetchedNodes);
                console.info('[ShareSpeedTest] normalized nodes:', fetchedNodes);

                const primaryNodes = fetchedNodes.filter((node) => node.isPrimary);
                const backupNodes = fetchedNodes.filter((node) => !node.isPrimary);
                const nodesToProbe = primaryNodes.length > 0 ? primaryNodes : fetchedNodes;

                setStatusText('正在并行测试节点速度...');

                setResults(createPendingResults(nodesToProbe));

                const testedNodes = new Set<string>();

                const runTests = async (targets: NodeInfo[]) => Promise.all(
                    targets.map((nodeInfo) =>
                        testNode(nodeInfo).then((result) => {
                            testedNodes.add(nodeInfo.url);
                            setResults((prev) => updateResultRow(prev, nodeInfo.url, result));
                            return result;
                        })
                    )
                );

                const primaryResults = await runTests(nodesToProbe);
                const primarySuccessful = primaryResults.filter((result) => result.success);
                console.info('[ShareSpeedTest] primary results:', primaryResults);

                let selectionPool = primarySuccessful;

                if (primarySuccessful.length === 0 && primaryNodes.length > 0 && backupNodes.length > 0) {
                    setResults((prev) => ([
                        ...prev,
                        ...createPendingResults(backupNodes),
                    ]));

                    const backupResults = await runTests(backupNodes);
                    const backupSuccessful = backupResults.filter((result) => result.success);
                    console.info('[ShareSpeedTest] backup results:', backupResults);

                    if (backupSuccessful.length > 0) {
                        selectionPool = backupSuccessful;
                    }
                }

                if (selectionPool.length === 0) {
                    setErrorText('所有测速节点均不可用，正在随机尝试打开一个节点...');

                    if (!hasRedirectedRef.current && fetchedNodes.length > 0) {
                        hasRedirectedRef.current = true;
                        const randIndex = Math.floor(Math.random() * fetchedNodes.length);
                        const randNode = fetchedNodes[randIndex];
                        const nodeUrl = toHttpsUrl(randNode.url);
                        const fromUrl = `${nodeUrl}/`;
                        // 当前页面打开
                        window.location.replace(fromUrl);
                    }
                    return;
                }

                if (selectionPool.length === 1) {
                    if (!hasRedirectedRef.current) {
                        hasRedirectedRef.current = true;
                        const onlyIndex = fetchedNodes.findIndex((node) => node.url === selectionPool[0].node);
                        setStatusText(`正在跳转至可用节点（节点${onlyIndex + 1}）...`);
                        const nodeUrl = toHttpsUrl(selectionPool[0].node);
                        const fromUrl = `${nodeUrl}/home`;
                        window.location.replace(fromUrl);
                    }
                    return;
                }

                // 按 weight/latency 加权随机：weight=0 的备用节点用 1/latency，保证备用池内也能按速度选
                const scoredNodes = selectionPool.map((result) => ({
                    ...result,
                    score: Math.max(result.weight, 1) / Math.max(result.durationMs, 1)
                }));

                const totalScore = scoredNodes.reduce((sum, n) => sum + n.score, 0);
                console.info('[ShareSpeedTest] scored nodes:', scoredNodes.map((item) => ({
                    node: item.node,
                    weight: item.weight,
                    durationMs: Number(item.durationMs.toFixed(2)),
                    score: item.score,
                    probability: totalScore > 0 ? item.score / totalScore : 0,
                })));
                let rand = Math.random() * totalScore;
                let pick = scoredNodes[scoredNodes.length - 1];
                for (const candidate of scoredNodes) {
                    rand -= candidate.score;
                    if (rand <= 0) { pick = candidate; break; }
                }
                console.info('[ShareSpeedTest] picked node:', pick);

                setStatusText('测速完成，2秒后自动跳转至优选节点…');

                autoTimerRef.current = window.setTimeout(() => {
                    if (hasRedirectedRef.current) return;
                    const pickIndex = fetchedNodes.findIndex((node) => node.url === pick.node);
                    setStatusText(`正在跳转至优选节点（节点${pickIndex + 1}）...`);
                    const nodeUrl = toHttpsUrl(pick.node);
                    const fromUrl = `${nodeUrl}/home`;
                    window.location.replace(fromUrl);
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
                    <p className="mt-1 text-xs text-gray-500">{nodes.length > 0 ? `共 ${nodes.length} 个节点` : ''}</p>
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
                                                {r.status === 'pending'
                                                    ? '测试中…'
                                                    : (r.success ? `${(r.durationMs / 1000).toFixed(3)} 秒` : 'wait')}
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
                                                    window.location.replace(fromUrl);
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
    const hasProtocol = /^https?:\/\//i.test(node);
    const url = hasProtocol ? node : `https://${node}`;
    return url;
}

function normalizeNodes(rawNodes: unknown[]): NodeInfo[] {
    return rawNodes
        .map((item) => parseNodeInfo(item))
        .filter((item): item is NodeInfo => Boolean(item?.url));
}

function extractRawNodes(rawData: unknown): unknown[] {
    if (Array.isArray(rawData)) {
        return rawData.flatMap((item) => splitRawNodeItem(item));
    }

    return splitRawNodeItem(rawData);
}

function splitRawNodeItem(item: unknown): unknown[] {
    if (typeof item !== 'string') {
        return item == null ? [] : [item];
    }

    const trimmed = item.trim();
    if (!trimmed) {
        return [];
    }

    // 兼容后端直接返回逗号/换行拼接的节点字符串。
    return trimmed
        .split(/[\n,，]+/)
        .map((part) => part.trim())
        .filter(Boolean);
}

function parseNodeInfo(item: unknown): NodeInfo | null {
    if (typeof item === 'string') {
        return createNodeInfoFromRaw(item);
    }

    if (!item || typeof item !== 'object') {
        return null;
    }

    const record = item as Record<string, unknown>;
    const rawUrl = typeof record.url === 'string'
        ? record.url
        : (typeof record.node === 'string'
            ? record.node
            : (typeof record.host === 'string' ? record.host : ''));
    const explicitWeight = parseManualWeight(record);

    return createNodeInfoFromRaw(rawUrl, explicitWeight);
}

function createNodeInfoFromRaw(rawUrl: string, explicitWeight?: number): NodeInfo | null {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return null;
    }

    const [urlPart, inlineWeightPart] = trimmed.split('|', 2);
    const normalizedUrl = urlPart.trim();
    if (!normalizedUrl) {
        return null;
    }

    const inlineWeight = parseNumericWeight(inlineWeightPart);
    const hasExplicitInlineWeight = typeof inlineWeight === 'number';
    const hasExplicitManualWeight = typeof explicitWeight === 'number';
    const weight = hasExplicitInlineWeight ? inlineWeight : (hasExplicitManualWeight ? explicitWeight : 0);

    return {
        url: normalizedUrl,
        weight,
        // 只有显式手动权重大于 0 的节点，才参与首轮测速。
        isPrimary: (hasExplicitInlineWeight || hasExplicitManualWeight) && weight > 0,
    };
}

function parseManualWeight(record: Record<string, unknown>): number | undefined {
    const manualWeightKeys = [
        'manual_weight',
        'manualWeight',
        'priority_weight',
        'priorityWeight',
        'custom_weight',
        'customWeight',
    ];

    for (const key of manualWeightKeys) {
        const parsed = parseNumericWeight(record[key]);
        if (typeof parsed === 'number') {
            return parsed;
        }
    }

    return undefined;
}

function parseNumericWeight(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
}

function createPendingResults(nodes: NodeInfo[]): SpeedTestResult[] {
    return nodes.map((node) => ({
        node: node.url,
        weight: node.weight,
        isPrimary: node.isPrimary,
        success: false,
        durationMs: 0,
        status: 'pending',
    }));
}

function updateResultRow(previous: SpeedTestResult[], nodeUrl: string, result: TestResult): SpeedTestResult[] {
    return previous.map((item) => {
        if (item.node !== nodeUrl) {
            return item;
        }

        return {
            node: result.node,
            weight: result.weight,
            isPrimary: result.isPrimary,
            success: result.success,
            durationMs: result.durationMs,
            status: result.success ? 'success' : 'fail',
        };
    });
}

async function testNode(nodeInfo: NodeInfo): Promise<TestResult> {
    const start = performance.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SPEEDTEST_TIMEOUT_MS);

    let success = false;
    try {
        const base = toHttpsUrl(nodeInfo.url);
        const url = `${base.replace(/\/$/, '')}/u/ping`;
        const resp = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        success = resp.status === 200;
    } catch (_) {
        success = false;
    } finally {
        clearTimeout(timeout);
    }

    const end = performance.now();
    return {
        node: nodeInfo.url,
        weight: nodeInfo.weight,
        isPrimary: nodeInfo.isPrimary,
        success,
        durationMs: end - start,
        status: success ? 'success' : 'fail'
    };
}

const Spinner: React.FC = () => (
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" aria-label="loading" />
);

export default ShareSpeedTestPage;
