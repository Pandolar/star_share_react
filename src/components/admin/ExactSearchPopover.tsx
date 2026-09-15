import React from 'react';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';

export interface ExactSearchField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'email';
}

interface ExactSearchPopoverProps {
  fields: ExactSearchField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

/** Compact opt-in exact filters; the page's familiar fuzzy search remains primary. */
const ExactSearchPopover: React.FC<ExactSearchPopoverProps> = ({ fields, values, onChange, onApply, onClear }) => {
  const activeCount = fields.reduce((count, field) => count + (values[field.key]?.trim() ? 1 : 0), 0);
  return (
    <Popover placement="bottom-end" showArrow>
      <PopoverTrigger>
        <Button variant="flat" startContent={<SlidersHorizontal className="h-4 w-4" />}>
          精确筛选{activeCount ? `（${activeCount}）` : ''}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,420px)] p-4">
        <div className="w-full space-y-3">
          <div><p className="font-medium">精确筛选</p><p className="mt-1 text-xs text-default-500">各条件为完全匹配，并与上方模糊搜索同时生效。</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                type={field.type || 'text'}
                value={values[field.key] || ''}
                onValueChange={(value) => onChange(field.key, value)}
                onKeyDown={(event) => event.key === 'Enter' && onApply()}
                size="sm"
              />
            ))}
          </div>
          <div className="flex justify-end gap-2"><Button size="sm" variant="light" onPress={onClear}>清空</Button><Button size="sm" color="primary" onPress={onApply}>应用</Button></div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ExactSearchPopover;
