import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, Chip, Select, SelectItem, Spinner, Textarea } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';

interface RuntimeLogFile {
  name: string;
  bytes: number;
  modified_at: number;
}

const LEVELS = ['ALL', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const formatBytes = (bytes: number): string => bytes < 1024 * 1024
  ? `${(bytes / 1024).toFixed(1)} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const RuntimeLogsPage: React.FC = () => {
  const [file, setFile] = useState('app');
  const [level, setLevel] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [files, setFiles] = useState<RuntimeLogFile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tail, fileList] = await Promise.all([
        adminApiService.getRuntimeLogs({ file, level, lines: 300 }),
        adminApiService.getRuntimeLogFiles(),
      ]);
      if (tail.code !== 20000) throw new Error(tail.msg || '运行日志加载失败');
      if (fileList.code !== 20000) throw new Error(fileList.msg || '日志文件列表加载失败');
      setLines(Array.isArray(tail.data?.lines) ? tail.data.lines : []);
      setFiles(Array.isArray(fileList.data?.files) ? fileList.data.files : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '运行日志加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [file, level]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-default-900">运行日志</h1>
          <p className="mt-1 text-sm text-default-500">只读查看当前 app/access 日志尾部；业务审计仍在“审计日志”。</p>
        </div>
        <Button color="primary" variant="flat" startContent={<RefreshCw size={16} />} onPress={() => void load()} isLoading={loading}>刷新</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="日志文件" selectedKeys={[file]} onSelectionChange={(keys) => setFile(String(Array.from(keys)[0] || 'app'))}>
          <SelectItem key="app">应用运行日志</SelectItem>
          <SelectItem key="access">HTTP 访问日志</SelectItem>
        </Select>
        <Select label="日志级别" selectedKeys={[level || 'ALL']} onSelectionChange={(keys) => {
          const selected = String(Array.from(keys)[0] || 'ALL');
          setLevel(selected === 'ALL' ? '' : selected);
        }}>
          {LEVELS.map((item) => <SelectItem key={item}>{item === 'ALL' ? '全部级别' : item}</SelectItem>)}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        {files.slice(0, 12).map((item) => <Chip key={item.name} variant="flat">{item.name} · {formatBytes(item.bytes)}</Chip>)}
      </div>

      <Card>
        <CardBody className="gap-3">
          {loading && lines.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center"><Spinner label="正在读取日志..." /></div>
          ) : (
            <Textarea
              isReadOnly
              minRows={18}
              maxRows={30}
              value={lines.join('\n') || '暂无匹配日志'}
              aria-label="运行日志内容"
              classNames={{ input: 'font-mono text-xs leading-5', inputWrapper: 'min-h-[32rem]' }}
            />
          )}
          <p className="text-xs text-default-400">最多显示最后 300 行。查询不会读取请求体、Token、密码或附件内容。</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default RuntimeLogsPage;
