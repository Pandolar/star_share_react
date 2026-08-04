import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  Tooltip,
} from '@heroui/react';
import {
  Bold,
  Code2,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  Heading2,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
  Quote,
  RefreshCw,
  Save,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';
import type { ArticleStatus, ArticleSummary, SaveArticleRequest } from '../../types/admin';

const EMPTY_ARTICLE: SaveArticleRequest = {
  identifier: '',
  title: '',
  description: '',
  content: '',
  status: 'draft',
};

type EditorMode = 'write' | 'split' | 'preview';
type MarkdownInsertion = { label: string; icon: ReactNode; before: string; after?: string; fallback?: string };

const MARKDOWN_TOOLS: MarkdownInsertion[] = [
  { label: '二级标题', icon: <Heading2 size={16} />, before: '## ', fallback: '标题' },
  { label: '粗体', icon: <Bold size={16} />, before: '**', after: '**', fallback: '粗体文字' },
  { label: '斜体', icon: <Italic size={16} />, before: '*', after: '*', fallback: '斜体文字' },
  { label: '无序列表', icon: <List size={16} />, before: '- ', fallback: '列表项' },
  { label: '有序列表', icon: <ListOrdered size={16} />, before: '1. ', fallback: '列表项' },
  { label: '引用', icon: <Quote size={16} />, before: '> ', fallback: '引用内容' },
  { label: '链接', icon: <Link size={16} />, before: '[', after: '](https://example.com)', fallback: '链接文字' },
  { label: '图片', icon: <Image size={16} />, before: '![', after: '](https://example.com/image.png)', fallback: '图片说明' },
  { label: '行内代码', icon: <Code2 size={16} />, before: '`', after: '`', fallback: 'code' },
  { label: '代码块', icon: <Code2 size={16} />, before: '```text\n', after: '\n```', fallback: '代码' },
  { label: '表格', icon: <Table2 size={16} />, before: '| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n' },
];

const publicUrl = (identifier: string): string => `${window.location.origin}/star/doc/${identifier}`;
const formatTime = (value?: string | null): string => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-';

const MarkdownPreview: FC<{ article: Pick<SaveArticleRequest, 'title' | 'description' | 'content'> }> = ({ article }) => (
  <div className="min-h-[32rem] rounded-xl border border-divider bg-content1 p-5 sm:p-8">
    <div className="mb-6 border-b border-divider pb-5">
      <h1 className="text-3xl font-bold leading-tight text-default-900">{article.title || '未命名文章'}</h1>
      {article.description && <p className="mt-2 text-default-500">{article.description}</p>}
    </div>
    <div className="space-y-4 text-default-700 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-default-100 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-default-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:border-b [&_h2]:border-divider [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-5 [&_ol]:list-decimal [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-default-900 [&_pre]:p-4 [&_pre]:text-default-100 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-divider [&_td]:p-2 [&_th]:border [&_th]:border-divider [&_th]:bg-default-100 [&_th]:p-2 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>{article.content || '*开始输入 Markdown 正文，预览会实时显示在这里。*'}</ReactMarkdown>
    </div>
  </div>
);

const ArticlesManagePage: FC = () => {
  const [rows, setRows] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentIdentifier, setCurrentIdentifier] = useState<string | null>(null);
  const [form, setForm] = useState<SaveArticleRequest>(EMPTY_ARTICLE);
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [pendingDelete, setPendingDelete] = useState<ArticleSummary | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredRows = useMemo(() => {
    if (!query) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) => row.title.toLowerCase().includes(needle) || row.identifier.includes(needle));
  }, [query, rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApiService.getArticles();
      if (response.code !== 20000) throw new Error(response.msg || '获取文章失败');
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setRows([]);
      showToast(error instanceof Error ? error.message : '获取文章失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setCurrentIdentifier(null);
    setForm({ ...EMPTY_ARTICLE });
    setEditorMode('split');
    setEditorOpen(true);
  };

  const openEdit = async (identifier: string) => {
    setEditorOpen(true);
    setEditorLoading(true);
    try {
      const response = await adminApiService.getArticle(identifier);
      if (response.code !== 20000) throw new Error(response.msg || '获取文章详情失败');
      setCurrentIdentifier(identifier);
      setForm(response.data);
    } catch (error) {
      setEditorOpen(false);
      showToast(error instanceof Error ? error.message : '获取文章详情失败', 'error');
    } finally {
      setEditorLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const identifier = form.identifier.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(identifier)) {
      showToast('标识符仅支持小写字母、数字和中划线，长度1-64位', 'warning');
      return false;
    }
    if (!form.title.trim()) {
      showToast('请填写文章标题', 'warning');
      return false;
    }
    if (form.title.trim().length > 120 || (form.description || '').trim().length > 300 || form.content.length > 50000) {
      showToast('标题、摘要或正文超过允许长度', 'warning');
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validateForm()) return;
    setSaving(true);
    const payload: SaveArticleRequest = {
      ...form,
      identifier: form.identifier.trim().toLowerCase(),
      title: form.title.trim(),
      description: (form.description || '').trim(),
    };
    try {
      const response = currentIdentifier
        ? await adminApiService.updateArticle(currentIdentifier, payload)
        : await adminApiService.createArticle(payload);
      if (response.code !== 20000) throw new Error(response.msg || '保存文章失败');
      setCurrentIdentifier(response.data.identifier);
      setForm(response.data);
      showToast(currentIdentifier ? '文章保存成功' : '文章创建成功', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存文章失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (row: ArticleSummary, status: ArticleStatus) => {
    setSaving(true);
    try {
      const detail = await adminApiService.getArticle(row.identifier);
      if (detail.code !== 20000) throw new Error(detail.msg || '获取文章详情失败');
      const response = await adminApiService.updateArticle(row.identifier, { ...detail.data, status });
      if (response.code !== 20000) throw new Error(response.msg || '更新文章状态失败');
      showToast(status === 'published' ? '文章已发布' : '文章已撤回为草稿', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新文章状态失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row: ArticleSummary) => {
    setPendingDelete(row);
    setDeleteOpen(true);
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await adminApiService.deleteArticle(pendingDelete.identifier, pendingDelete.revision);
      if (response.code !== 20000) throw new Error(response.msg || '删除文章失败');
      showToast('文章已删除', 'success');
      setDeleteOpen(false);
      setPendingDelete(null);
      if (currentIdentifier === pendingDelete.identifier) setEditorOpen(false);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除文章失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = async (identifier: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(identifier));
      showToast('文章链接已复制', 'success');
    } catch {
      showToast('复制失败，请手动复制文章链接', 'error');
    }
  };

  const insertMarkdown = (tool: MarkdownInsertion) => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? form.content.length;
    const end = editor?.selectionEnd ?? form.content.length;
    const selected = form.content.slice(start, end) || tool.fallback || '';
    const addition = `${tool.before}${selected}${tool.after || ''}`;
    const nextContent = `${form.content.slice(0, start)}${addition}${form.content.slice(end)}`;
    setForm((current) => ({ ...current, content: nextContent }));
    window.setTimeout(() => {
      const nextCursor = start + tool.before.length + selected.length;
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const applySearch = () => setQuery(queryInput.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">文章管理</h1><p className="text-sm text-default-500">维护独立 Markdown 单页，不展示分类或其他文章</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={load} isLoading={loading}>刷新</Button>
          <Button color="primary" startContent={<FilePlus2 size={16} />} onPress={openCreate}>新增文章</Button>
        </div>
      </div>

      <Alert color="primary" variant="flat" title="公开地址规则" description="文章发布后通过 /star/doc/标识符 访问；草稿、撤回或删除后该地址返回 404。图片请使用可公开访问的 HTTPS 地址。" />

      <Card shadow="sm"><CardBody className="flex flex-col gap-3 sm:flex-row">
        <Input value={queryInput} onValueChange={setQueryInput} onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }} placeholder="搜索标题或标识符" startContent={<Search size={16} />} />
        <Button color="primary" onPress={applySearch}>查询</Button>
        {query && <Button variant="flat" onPress={() => { setQueryInput(''); setQuery(''); }}>重置</Button>}
      </CardBody></Card>

      <Table aria-label="文章列表" classNames={{ wrapper: 'min-h-80' }}>
        <TableHeader>
          <TableColumn>文章</TableColumn>
          <TableColumn>公开地址</TableColumn>
          <TableColumn>状态</TableColumn>
          <TableColumn>更新时间</TableColumn>
          <TableColumn align="end">操作</TableColumn>
        </TableHeader>
        <TableBody isLoading={loading} loadingContent={<Spinner label="加载文章中..." />} emptyContent="暂无文章，点击右上角新增">
          {filteredRows.map((row) => (
            <TableRow key={row.identifier}>
              <TableCell><div className="max-w-sm"><p className="font-medium">{row.title}</p><p className="truncate text-xs text-default-500">{row.description || '无摘要'}</p></div></TableCell>
              <TableCell><code className="text-xs">/star/doc/{row.identifier}</code></TableCell>
              <TableCell><Chip color={row.status === 'published' ? 'success' : 'default'} variant="flat">{row.status === 'published' ? '已发布' : '草稿'}</Chip></TableCell>
              <TableCell><span className="whitespace-nowrap text-sm">{formatTime(row.updated_at)}</span></TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Tooltip content="编辑"><Button isIconOnly size="sm" variant="light" aria-label={`编辑${row.title}`} onPress={() => void openEdit(row.identifier)}><Pencil size={16} /></Button></Tooltip>
                  <Tooltip content="复制链接"><Button isIconOnly size="sm" variant="light" aria-label={`复制${row.title}链接`} onPress={() => void copyLink(row.identifier)}><Copy size={16} /></Button></Tooltip>
                  <Tooltip content="打开公开页"><Button isIconOnly size="sm" variant="light" aria-label={`打开${row.title}`} onPress={() => window.open(publicUrl(row.identifier), '_blank', 'noopener,noreferrer')} isDisabled={row.status !== 'published'}><ExternalLink size={16} /></Button></Tooltip>
                  <Button size="sm" variant="flat" color={row.status === 'published' ? 'warning' : 'success'} onPress={() => void changeStatus(row, row.status === 'published' ? 'draft' : 'published')} isDisabled={saving}>{row.status === 'published' ? '撤回' : '发布'}</Button>
                  <Tooltip content="删除"><Button isIconOnly size="sm" color="danger" variant="light" aria-label={`删除${row.title}`} onPress={() => confirmDelete(row)}><Trash2 size={16} /></Button></Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-default-500">共 {filteredRows.length} 篇文章</p>

      <Modal isOpen={editorOpen} onClose={() => setEditorOpen(false)} size="5xl" scrollBehavior="inside" classNames={{ base: 'max-h-[96vh]' }}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{currentIdentifier ? `编辑文章：${form.title || currentIdentifier}` : '新增文章'}</ModalHeader>
          <ModalBody className="gap-4">
            {editorLoading ? <div className="flex min-h-96 items-center justify-center"><Spinner label="加载文章详情中..." /></div> : <>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="文章标题" value={form.title} onValueChange={(title) => setForm((current) => ({ ...current, title }))} maxLength={120} isRequired />
                <Input label="页面标识符" value={form.identifier} onValueChange={(identifier) => setForm((current) => ({ ...current, identifier: identifier.toLowerCase() }))} placeholder="getting-started" description={`公开地址：/star/doc/${form.identifier || '标识符'}`} maxLength={64} isRequired />
                <Textarea className="md:col-span-2" label="SEO 摘要" value={form.description || ''} onValueChange={(description) => setForm((current) => ({ ...current, description }))} maxLength={300} minRows={2} description={`${(form.description || '').length}/300`} />
                <Select label="发布状态" selectedKeys={[form.status]} onSelectionChange={(keys) => setForm((current) => ({ ...current, status: String(Array.from(keys)[0] || 'draft') as ArticleStatus }))}>
                  <SelectItem key="draft">草稿（公开页 404）</SelectItem>
                  <SelectItem key="published">已发布（公开可访问）</SelectItem>
                </Select>
                <Input label="正文长度" value={`${form.content.length.toLocaleString('zh-CN')} / 50,000 字符`} isReadOnly />
              </div>

              {currentIdentifier && currentIdentifier !== form.identifier && <Alert color="warning" title="标识符已修改" description={`保存后旧地址 /star/doc/${currentIdentifier} 将立即失效，新地址为 /star/doc/${form.identifier}。`} />}
              <Divider />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  {MARKDOWN_TOOLS.map((tool) => <Tooltip key={tool.label} content={tool.label}><Button isIconOnly size="sm" variant="flat" aria-label={tool.label} onPress={() => insertMarkdown(tool)}>{tool.icon}</Button></Tooltip>)}
                </div>
                <Tabs aria-label="编辑器视图" size="sm" selectedKey={editorMode} onSelectionChange={(key) => setEditorMode(String(key) as EditorMode)}>
                  <Tab key="write" title="编辑" /><Tab key="split" title="分屏" /><Tab key="preview" title="预览" />
                </Tabs>
              </div>

              <div className={editorMode === 'split' ? 'grid gap-4 xl:grid-cols-2' : ''}>
                {editorMode !== 'preview' && <Textarea ref={editorRef} aria-label="Markdown 正文" value={form.content} onValueChange={(content) => setForm((current) => ({ ...current, content }))} minRows={24} maxLength={50000} placeholder="# 正文标题\n\n在这里输入 Markdown 内容..." classNames={{ input: 'font-mono text-sm leading-6', inputWrapper: 'min-h-[32rem]' }} />}
                {editorMode !== 'write' && <MarkdownPreview article={form} />}
              </div>
            </>}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setEditorOpen(false)}>关闭</Button>
            {currentIdentifier && form.status === 'published' && <Button variant="flat" startContent={<ExternalLink size={16} />} onPress={() => window.open(publicUrl(form.identifier), '_blank', 'noopener,noreferrer')}>打开公开页</Button>}
            <Button color="primary" startContent={<Save size={16} />} isLoading={saving} isDisabled={editorLoading} onPress={() => void save()}>保存文章</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} size="md">
        <ModalContent>
          <ModalHeader>确认删除文章</ModalHeader>
          <ModalBody><Alert color="danger" title={`删除“${pendingDelete?.title || ''}”`} description={`删除后 /star/doc/${pendingDelete?.identifier || ''} 将立即返回 404，且无法从系统配置恢复。`} /></ModalBody>
          <ModalFooter><Button variant="light" onPress={() => setDeleteOpen(false)}>取消</Button><Button color="danger" isLoading={deleting} onPress={() => void remove()}>确认删除</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default ArticlesManagePage;
