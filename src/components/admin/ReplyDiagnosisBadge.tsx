import React from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { CircleHelp } from 'lucide-react';

export interface ReplyDiagnosis {
  code: string;
  label: string;
  detail: string;
  at?: string | null;
}

const formatAt = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
};

/** Click the icon (or hover for the native hint) to see why AI has not replied. */
export default function ReplyDiagnosisBadge({ diagnosis }: { diagnosis?: ReplyDiagnosis | null }): React.ReactElement | null {
  if (!diagnosis) return null;
  const at = formatAt(diagnosis.at);
  return (
    <Popover placement="bottom-start" showArrow>
      <PopoverTrigger>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="warning"
          aria-label={`AI 未回复：${diagnosis.label}`}
          title={`AI 未回复：${diagnosis.label}${diagnosis.detail ? `（${diagnosis.detail}）` : ''}`}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs">
        <div className="space-y-1 p-1.5">
          <p className="text-sm font-medium">AI 未回复：{diagnosis.label}</p>
          {diagnosis.detail && <p className="text-xs text-default-500">{diagnosis.detail}</p>}
          {at && <p className="text-xs text-default-400">最后一条用户消息：{at}</p>}
          <p className="text-xs text-default-400">内部原因码：{diagnosis.code}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
