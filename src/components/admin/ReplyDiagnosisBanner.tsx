import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { CircleHelp, RotateCcw, X } from 'lucide-react';

export interface ReplyDiagnosis {
  code: string;
  label: string;
  detail: string;
  at?: string | null;
}

const RETRYABLE = new Set(['draft_timeout', 'draft_rejected', 'invalid_output', 'provider_unavailable', 'reply_untrusted', 'worker_timeout', 'clarify_exhausted']);

const formatAt = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
};

/** Dismissible banner shown above the reply composer. */
export default function ReplyDiagnosisBanner({
  diagnosis, conversationId, onRetry, retrying = false,
}: {
  diagnosis?: ReplyDiagnosis | null;
  conversationId: number;
  onRetry?: () => void;
  retrying?: boolean;
}): React.ReactElement | null {
  const key = diagnosis ? `cs_reason_hidden:${conversationId}:${diagnosis.code}:${diagnosis.at || ''}` : '';
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { setHidden(Boolean(key && window.localStorage.getItem(key) === '1')); }
    catch { setHidden(false); }
  }, [key]);
  if (!diagnosis || hidden) return null;
  const close = () => {
    try { window.localStorage.setItem(key, '1'); } catch { /* ignore */ }
    setHidden(true);
  };
  const at = formatAt(diagnosis.at);
  return (
    <div className="mb-2 flex flex-wrap items-start gap-2 rounded-medium border border-warning-200 bg-warning-50 px-3 py-2 text-xs">
      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-default-700">AI 未回复：{diagnosis.label}</p>
        <p className="text-default-600">{diagnosis.detail}</p>
        {at && <p className="text-default-400">最后一条用户消息：{at}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onRetry && RETRYABLE.has(diagnosis.code) && (
          <Button size="sm" variant="flat" isLoading={retrying} startContent={!retrying ? <RotateCcw className="h-3.5 w-3.5" /> : undefined} onPress={onRetry}>重新生成</Button>
        )}
        <Button isIconOnly size="sm" variant="light" aria-label="关闭提示" onPress={close}><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
