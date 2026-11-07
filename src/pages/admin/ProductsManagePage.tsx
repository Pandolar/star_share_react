import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, CardBody, Checkbox, Chip, Code, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader,
  Select, SelectItem, Spinner, Tab, Tabs, Textarea,
} from '@heroui/react';
import { Copy, KeyRound, Layers, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import csProductApi, { CsProduct } from '../../services/csProductApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { showToast } from '../../components/Toast';

type Draft = {
  id?: number; key: string; name: string; domains: string; app_key: string; dataset_id: string; dataset_key: string;
  personaName: string; personaTone: string; personaForbidden: string; personaEscalate: string;
  overrideText: string; status: 'active' | 'disabled';
  sdk: boolean; iframe: boolean; rest: boolean;
};

const emptyDraft = (): Draft => ({
  key: '', name: '', domains: '', app_key: '', dataset_id: '', dataset_key: '',
  personaName: '', personaTone: '', personaForbidden: '', personaEscalate: '',
  overrideText: '{\n  "welcome": {"message": "您好，请描述您的问题。"},\n  "entry": {"floating_bubble": "需要帮助？联系我们"}\n}',
  status: 'active', sdk: true, iframe: true, rest: true,
});

const draftOf = (product: CsProduct): Draft => ({
  id: product.id, key: product.key, name: product.name, domains: (product.domains || []).join('\n'),
  app_key: '', dataset_id: product.dataset_id || '', dataset_key: '',
  personaName: product.persona?.name || '', personaTone: product.persona?.tone || '',
  personaForbidden: product.persona?.forbidden || '', personaEscalate: product.persona?.escalate || '',
  overrideText: JSON.stringify(product.config_override || {}, null, 2),
  status: product.status, sdk: product.embed_modes?.sdk !== false,
  iframe: product.embed_modes?.iframe !== false, rest: product.embed_modes?.rest !== false,
});

const origin = typeof window === 'undefined' ? 'https://cs.example.com' : window.location.origin;

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = '复制' }) => (
  <Button size="sm" variant="flat" startContent={<Copy size={14} />} onPress={() => {
    void navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => showToast('复制失败，请手动选择', 'error'));
  }}>{label}</Button>
);

const Docs: React.FC<{ product: CsProduct }> = ({ product }) => {
  const key = product.key;
  const widget = product.widget_key || '<尚未生成 widget_key>';
  const sdk = `<script src="${origin}/embed.js" data-cs-product="${key}" defer></script>\n<script>\n  CS.init({\n    product: '${key}',\n    tokenProvider: async () => (await fetch('/api/cs-token')).text(),\n    user: { id: '123', name: '张三' }\n  });\n</script>`;
  const iframe = `<iframe src="${origin}/embed/chat?product=${key}"\n        style="width:380px;height:560px;border:0"></iframe>`;
  const signNode = `import crypto from 'node:crypto';\n\nconst key = '${key}';\nconst secret = process.env.CS_TOKEN_SECRET; // 后台创建/轮换时展示一次\nconst ts = Math.floor(Date.now() / 1000);\nconst signature = crypto.createHmac('sha256', secret)\n  .update(\`\${key}\\n\${ts}\\n\${userId}\`)\n  .digest('base64url');\n\nawait fetch('${origin}/star-api/cs/token', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'X-CS-Key': '${widget}', 'X-CS-Timestamp': String(ts), 'X-CS-Signature': signature },\n  body: JSON.stringify({ user_id: userId }),\n});`;
  const signPython = `import base64, hashlib, hmac, time, requests\n\nkey = '${key}'\nsecret = os.environ['CS_TOKEN_SECRET']\nts = int(time.time())\nmessage = f'{key}\\n{ts}\\n{user_id}'.encode()\nsignature = base64.urlsafe_b64encode(hmac.new(secret.encode(), message, hashlib.sha256).digest()).rstrip(b'=').decode()\n\nrequests.post('${origin}/star-api/cs/token', json={'user_id': user_id},\n              headers={'X-CS-Key': '${widget}', 'X-CS-Timestamp': str(ts), 'X-CS-Signature': signature}, timeout=10)`;
  return <Tabs aria-label="接入文档" variant="underlined">
    <Tab key="sdk" title="SDK 气泡（推荐）"><div className="space-y-3">
      <p className="text-sm text-default-600">在任意页面引入一行脚本即可出现右下角气泡；已登录用户由产品后端签发 token。未配置 <Code>tokenProvider</Code> 时按匿名处理（若产品允许）。</p>
      <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs">{sdk}</pre>
      <div className="flex gap-2"><CopyButton text={sdk} /><CopyButton text={widget} label="复制 widget_key" /></div>
      <p className="text-xs text-default-500">可选事件：<Code>CS.on('unread', n =&gt; ...)</Code>、<Code>CS.open()</Code>、<Code>CS.close()</Code>、<Code>CS.refreshToken()</Code>。</p>
    </div></Tab>
    <Tab key="iframe" title="iframe"><div className="space-y-3">
      <p className="text-sm text-default-600">不方便加载第三方脚本时直接嵌 iframe；父页面通过 <Code>postMessage</Code> 传入 <Code>{'{ type: "cs:token", token }'}</Code> 即可登录。</p>
      <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs">{iframe}</pre>
      <CopyButton text={iframe} />
    </div></Tab>
    <Tab key="token" title="服务端换 token"><div className="space-y-3">
      <p className="text-sm text-default-600">签名 = HMAC-SHA256(产品密钥, <Code>{'key\\n时间戳\\nuser_id'}</Code>)，时间戳允许 ±5 分钟。返回的 token 15 分钟有效，过期用同样方式再换。</p>
      <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs">{signNode}</pre>
      <CopyButton text={signNode} />
      <details><summary className="cursor-pointer text-sm">Python 示例</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-default-100 p-3 text-xs">{signPython}</pre></details>
    </div></Tab>
    <Tab key="rest" title="REST 接口"><div className="space-y-2 text-sm">
      {[
        ['POST /star-api/cs/token', '产品后端换取 15 分钟用户令牌（需签名头）'],
        ['GET /star-api/cs/config?…', '拉取欢迎语、入口、分类；需 X-CS-Key'],
        ['GET /star-api/cs/conversation', '拉取当前用户在本产品的会话与消息（X-CS-Key + X-CS-User-Token）'],
        ['POST /star-api/cs/conversation', '创建/复用会话'],
        ['POST /star-api/cs/messages', '发送文本消息，触发 AI/转人工'],
      ].map(([path, desc]) => <div key={path} className="flex flex-wrap items-baseline gap-2 rounded border border-divider p-2"><Code>{path}</Code><span className="text-default-600">{desc}</span></div>)}
      <p className="text-xs text-default-500">所有接口都按产品隔离；请勿把 widget_key 与 token 密钥写进前端。</p>
    </div></Tab>
    <Tab key="help" title="排查与运营"><div className="space-y-3 text-sm">
      <table className="w-full text-left"><thead className="bg-default-100"><tr><th className="px-2 py-1">现象</th><th className="px-2 py-1">原因与处理</th></tr></thead><tbody>
        {[
          ['缺少 X-CS-Key', 'SDK/iframe 的 product 参数与后台 widget_key 不匹配；重新复制接入代码'],
          ['签名校验失败', '产品服务端密钥与后台不一致，或刚轮换过；用一次性下发的新密钥更新'],
          ['签名已过期', '服务器时间偏差超过 5 分钟，校准 NTP'],
          ['来源域名未在允许列表', '在「允许域名」补充该站点域名，支持 *.example.com'],
          ['该产品客服已停用', '后台产品状态改为启用'],
          ['AI 不回复', '未填写 Dify 应用 key，或该应用在 Dify 侧停用；未配置时只提供人工客服'],
          ['知识答非所问', '本产品 dataset_id 与 Dify 应用的检索库不一致；核对应用绑定的知识库'],
          ['坐席收不到会话', '工作台产品筛选选的是其它产品；切到「全部产品」或在列表筛选本产品'],
        ].map(([a, b]) => <tr key={a} className="border-t border-divider"><td className="px-2 py-1 align-top">{a}</td><td className="px-2 py-1 align-top text-default-600">{b}</td></tr>)}
      </tbody></table>
      <Alert color="primary" variant="flat" title="新产品上线清单" description="① 后台创建产品并设置允许域名；② 在 Dify 建独立应用与知识库，把 app_key / dataset_id / dataset_key 填回产品；③ 知识管理选择该产品，从默认产品复制通用知识再补充产品知识；④ 审核通过后同步；⑤ 用 SDK 接入并在工作台确认能收到会话。" />
    </div></Tab>
  </Tabs>;
};

export default function ProductsManagePage() {
  const { can } = useAdminAuth();
  const canManage = can('customer_service.knowledge.manage');
  const [rows, setRows] = useState<CsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<Draft | null>(null);
  const [secret, setSecret] = useState<{ value: string; name: string } | null>(null);
  const [source, setSource] = useState<number>(0);
  const [target, setTarget] = useState<number | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourceItems, setSourceItems] = useState<Array<Record<string, unknown>>>([]);
  const [picked, setPicked] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows((await csProductApi.list()).data); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '加载失败'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const realProducts = useMemo(() => rows.filter((row) => !row.is_default), [rows]);

  const save = async () => {
    if (!editor) return;
    let override: Record<string, unknown> = {};
    try { override = editor.overrideText.trim() ? JSON.parse(editor.overrideText) : {}; }
    catch { showToast('配置覆盖不是合法 JSON', 'warning'); return; }
    const payload: Record<string, unknown> = {
      key: editor.key.trim().toLowerCase(), name: editor.name.trim(),
      domains: editor.domains.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      dataset_id: editor.dataset_id.trim() || null,
      persona: { name: editor.personaName, tone: editor.personaTone, forbidden: editor.personaForbidden, escalate: editor.personaEscalate },
      config_override: override, status: editor.status,
      embed_modes: { sdk: editor.sdk, iframe: editor.iframe, rest: editor.rest },
    };
    if (editor.app_key.trim()) payload.app_key = editor.app_key.trim();
    if (editor.dataset_key.trim()) payload.dataset_key = editor.dataset_key.trim();
    setBusy(true);
    try {
      if (editor.id) await csProductApi.update({ ...payload, id: editor.id } as never);
      else {
        const created = await csProductApi.create(payload as never);
        if (created.data.token_secret_once) setSecret({ value: created.data.token_secret_once, name: created.data.name });
      }
      setEditor(null); await load(); showToast('产品已保存', 'success');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '保存失败', 'error'); }
    finally { setBusy(false); }
  };

  const rotate = async (row: CsProduct, action: 'widget_key' | 'token_secret') => {
    if (!window.confirm(action === 'widget_key' ? '轮换 widget_key 后，旧接入代码会立即失效。继续？' : '轮换密钥后，产品服务端旧签名会立即失效。继续？')) return;
    setBusy(true);
    try {
      const result = await csProductApi.rotate(row.id, action);
      await load();
      if (result.data.token_secret_once) setSecret({ value: result.data.token_secret_once, name: row.name });
      showToast('轮换完成', 'success');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '轮换失败', 'error'); }
    finally { setBusy(false); }
  };

  const openCopy = async (row: CsProduct) => {
    setTarget(row.id); setCopyOpen(true); setPicked({}); setSourceItems([]);
    try {
      const result = await csProductApi.knowledge('published', source);
      setSourceItems(result.data);
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '读取源产品知识失败', 'error'); }
  };

  const copy = async () => {
    if (!target) return;
    const ids = Object.keys(picked).filter((id) => picked[Number(id)]).map(Number);
    if (!ids.length) { showToast('请先选择要复制的知识', 'warning'); return; }
    setBusy(true);
    try {
      const result = await csProductApi.copyKnowledge({ source_product_id: source, target_product_id: target, candidate_ids: ids });
      showToast(`已复制 ${result.data.copied} 条到目标产品（独立副本）`, 'success');
      setCopyOpen(false); await load();
    } catch (caught) { showToast(caught instanceof Error ? caught.message : '复制失败', 'error'); }
    finally { setBusy(false); }
  };

  return <main className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">客服产品接入</h1>
        <p className="mt-1 text-sm text-default-500">一套客服后端服务多个产品；会话与知识按产品隔离，默认产品沿用现有配置与知识库。</p>
      </div>
      <div className="flex gap-2">
        <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={() => void load()}>刷新</Button>
        <Button color="primary" isDisabled={!canManage} onPress={() => setEditor(emptyDraft())}>新建产品</Button>
      </div>
    </header>
    {error && <Alert color="danger" title={error} />}
    {!canManage && <Alert color="warning" variant="flat" title="只读" description="需要「客服知识管理」权限才能创建或修改产品。" />}

    {loading ? <Spinner label="正在加载产品…" /> : rows.map((product) => <Card key={product.key} shadow="none" className="border border-divider">
      <CardBody className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <Chip size="sm" variant="flat" color={product.is_default ? 'default' : product.status === 'active' ? 'success' : 'warning'}>{product.is_default ? '默认产品' : product.status === 'active' ? '启用中' : '已停用'}</Chip>
            <Code>{product.key}</Code>
            {product.usage && <span className="text-xs text-default-500">会话 {product.usage.conversations} · 知识 {product.usage.knowledge} · 待审 {product.usage.pending}</span>}
            {!product.is_default && !product.has_app_key && <Chip size="sm" color="warning" variant="flat">未配置 Dify 应用（AI 关闭）</Chip>}
            {!product.is_default && !product.dataset_id && <Chip size="sm" color="warning" variant="flat">未配置知识库</Chip>}
          </div>
          {!product.is_default && <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="flat" startContent={<Layers size={14} />} isDisabled={!canManage} onPress={() => void openCopy(product)}>从其他产品复制知识</Button>
            <Button size="sm" variant="light" isDisabled={!canManage} onPress={() => setEditor(draftOf(product))}>编辑</Button>
          </div>}
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded border border-divider p-2"><p className="text-xs text-default-500">组件标识 widget_key</p><p className="break-all font-mono text-xs">{product.widget_key || '—'}</p></div>
          <div className="rounded border border-divider p-2"><p className="text-xs text-default-500">知识库 dataset_id</p><p className="break-all font-mono text-xs">{product.dataset_id || '—'}</p></div>
          <div className="rounded border border-divider p-2"><p className="text-xs text-default-500">允许域名</p><p className="break-all text-xs">{product.is_default ? '跟随全局站点配置' : (product.domains.length ? product.domains.join('、') : '未限制（不建议）')}</p></div>
          <div className="rounded border border-divider p-2"><p className="text-xs text-default-500">密钥状态</p><p className="text-xs">Dify 应用 {product.has_app_key ? '已配置' : '未配置'} · 知识库 {product.has_dataset_key ? '已配置' : '未配置'} · 签名密钥 {product.has_token_secret ? '已配置' : '—'}</p></div>
        </div>

        {!product.is_default && <div className="flex flex-wrap gap-2">
          <CopyButton text={product.widget_key || ''} label="复制 widget_key" />
          <Button size="sm" variant="flat" startContent={<KeyRound size={14} />} isDisabled={!canManage} onPress={() => void rotate(product, 'widget_key')}>轮换 widget_key</Button>
          <Button size="sm" variant="flat" color="danger" startContent={<ShieldCheck size={14} />} isDisabled={!canManage} onPress={() => void rotate(product, 'token_secret')}>轮换签名密钥</Button>
          <Button size="sm" variant="light" isDisabled={!canManage} onPress={() => setEditor({ ...draftOf(product), status: product.status === 'active' ? 'disabled' : 'active' })}>{product.status === 'active' ? '停用产品' : '启用产品'}</Button>
        </div>}

        <Docs product={product} />
      </CardBody>
    </Card>)}
    {!loading && !rows.length && <Alert color="warning" title="没有产品" description="请先创建产品，或在全局客服配置中启用默认产品。" />}

    <Modal isOpen={Boolean(editor)} onClose={() => !busy && setEditor(null)} size="4xl" scrollBehavior="inside">
      <ModalContent><ModalHeader>{editor?.id ? `编辑产品 · ${editor.name}` : '新建客服产品'}</ModalHeader>
        <ModalBody className="gap-3">{editor && <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="产品标识 key" value={editor.key} isDisabled={Boolean(editor.id)} onValueChange={(value) => setEditor({ ...editor, key: value.toLowerCase() })} description="小写字母开头，2-32 位；接入代码与权限都引用它" />
            <Input label="产品名称" value={editor.name} onValueChange={(value) => setEditor({ ...editor, name: value })} />
          </div>
          <Textarea label="允许域名" minRows={2} value={editor.domains} onValueChange={(value) => setEditor({ ...editor, domains: value })} description="每行一个，可写 *.example.com；留空表示不限制（不推荐）" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Dify 应用 key" type="password" placeholder={editor.id ? '留空表示不修改' : 'app-...'} value={editor.app_key} onValueChange={(value) => setEditor({ ...editor, app_key: value })} description="每个产品独立应用，绑定自己的知识库" />
            <Input label="Dify 知识库 ID" value={editor.dataset_id} onValueChange={(value) => setEditor({ ...editor, dataset_id: value })} />
          </div>
          <Input label="Dify 知识库 key" type="password" placeholder={editor.id ? '留空表示不修改' : 'dataset-...'} value={editor.dataset_key} onValueChange={(value) => setEditor({ ...editor, dataset_key: value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="人设称呼" placeholder="例如：NiceCode 小助手" value={editor.personaName} onValueChange={(value) => setEditor({ ...editor, personaName: value })} />
            <Input label="语气" placeholder="简洁、专业" value={editor.personaTone} onValueChange={(value) => setEditor({ ...editor, personaTone: value })} />
            <Input label="禁止事项" placeholder="不承诺未上线功能" value={editor.personaForbidden} onValueChange={(value) => setEditor({ ...editor, personaForbidden: value })} />
            <Input label="升级条件" placeholder="涉及退款/账号安全立即转人工" value={editor.personaEscalate} onValueChange={(value) => setEditor({ ...editor, personaEscalate: value })} />
          </div>
          <Textarea label="配置覆盖（JSON）" minRows={6} value={editor.overrideText} onValueChange={(value) => setEditor({ ...editor, overrideText: value })} description="深合并到全局默认配置；数组整体替换。可覆盖 welcome / entry / categories / limits / attachments / sla" />
          <div className="flex flex-wrap gap-4">
            <Checkbox isSelected={editor.sdk} onValueChange={(value) => setEditor({ ...editor, sdk: value })}>允许 SDK 接入</Checkbox>
            <Checkbox isSelected={editor.iframe} onValueChange={(value) => setEditor({ ...editor, iframe: value })}>允许 iframe 接入</Checkbox>
            <Checkbox isSelected={editor.rest} onValueChange={(value) => setEditor({ ...editor, rest: value })}>允许 REST 接入</Checkbox>
            <Checkbox isSelected={editor.status === 'active'} onValueChange={(value) => setEditor({ ...editor, status: value ? 'active' : 'disabled' })}>启用产品</Checkbox>
          </div>
          <Alert color="primary" variant="flat" title="保存后如何接" description="保存产品后，卡片里的接入文档会自动带上本产品的 key 与 widget_key；签名密钥只在创建或轮换时展示一次，请立即保存到产品服务端。" />
        </>}</ModalBody>
        <ModalFooter><Button variant="light" isDisabled={busy} onPress={() => setEditor(null)}>取消</Button><Button color="primary" isLoading={busy} isDisabled={!canManage} onPress={() => void save()}>保存</Button></ModalFooter></ModalContent>
    </Modal>

    <Modal isOpen={Boolean(secret)} onClose={() => setSecret(null)} size="lg">
      <ModalContent><ModalHeader>签名密钥（仅显示一次）</ModalHeader>
        <ModalBody className="gap-3">
          <Alert color="warning" title="立即保存" description={`这是「${secret?.name}」的签名密钥，关闭后无法再次查看；丢失只能轮换。旧密钥已立即失效。`} />
          <Code className="block break-all p-3">{secret?.value}</Code>
          <CopyButton text={secret?.value || ''} label="复制密钥" />
        </ModalBody>
        <ModalFooter><Button color="primary" onPress={() => setSecret(null)}>我已保存</Button></ModalFooter></ModalContent>
    </Modal>

    <Modal isOpen={copyOpen} onClose={() => !busy && setCopyOpen(false)} size="3xl" scrollBehavior="inside">
      <ModalContent><ModalHeader>复制知识到本产品</ModalHeader>
        <ModalBody className="gap-3">
          <Alert color="primary" variant="flat" title="复制是独立的" description="复制后会生成目标产品自己的知识条目，后续两边分别维护；源产品更新不会自动同步。" />
          <div className="flex flex-wrap items-end gap-2">
            <Select label="源产品" className="max-w-xs" selectedKeys={[String(source)]} onSelectionChange={(keys) => { const value = Number(Array.from(keys)[0] || 0); setSource(value); void csProductApi.knowledge('published', value).then((result) => setSourceItems(result.data)).catch(() => setSourceItems([])); }}>
              {rows.map((row) => <SelectItem key={String(row.id)}>{row.name}</SelectItem>)}
            </Select>
            <span className="text-sm text-default-500">已选 {Object.values(picked).filter(Boolean).length} 条</span>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {sourceItems.map((item) => <label key={String(item.id)} className="flex items-start gap-2 rounded border border-divider p-2 text-sm">
              <Checkbox isSelected={Boolean(picked[Number(item.id)])} onValueChange={(value) => setPicked((current) => ({ ...current, [Number(item.id)]: value }))} />
              <span className="flex-1">{String(item.question)}<span className="ml-2 text-xs text-default-400">{String(item.status)}</span></span>
            </label>)}
            {!sourceItems.length && <p className="p-3 text-center text-sm text-default-500">源产品暂无可复制知识。</p>}
          </div>
        </ModalBody>
        <ModalFooter><Button variant="light" isDisabled={busy} onPress={() => setCopyOpen(false)}>取消</Button><Button color="primary" isLoading={busy} onPress={() => void copy()}>复制已选</Button></ModalFooter></ModalContent>
    </Modal>
  </main>;
}
