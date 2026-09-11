import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Chip, Image, Input, NumberInput, Select, SelectItem, Switch, Textarea } from '@heroui/react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import adminApiService from '../../services/adminApi';

interface Props {
  value: string;
  onChange: (json: string) => void;
  disabled?: boolean;
}

type AttachmentKind = 'image' | 'document' | 'video' | 'audio';
type JsonRecord = Record<string, unknown>;

const KINDS: Array<{ key: AttachmentKind; label: string }> = [
  { key: 'image', label: '图片' },
  { key: 'document', label: '文档' },
  { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' },
];

const DEFAULT_CONFIG: JsonRecord = {
  enabled: false,
  provider: 'chatwoot',
  scope: { self_site: true, whitelabel: false, distributor: false },
  entry: {
    tab_enabled: true,
    tab_label: '在线客服',
    floating_enabled: true,
    floating_position: 'right',
    floating_bubble: '需要帮助？联系客服',
    guest_enabled: false,
    guest_login_hint: '请先登录后再联系客服',
  },
  categories: [
    { id: 'general', name: '使用咨询', enabled: true, description: '产品使用、功能咨询' },
    { id: 'payment', name: '支付与订单', enabled: true, description: '支付、到账、退款' },
    { id: 'account', name: '账号与套餐', enabled: true, description: '登录、套餐、额度' },
    { id: 'bug', name: '故障报修', enabled: true, description: '页面或功能异常' },
  ],
  welcome: {
    title: '在线客服',
    message: '您好，请描述您遇到的问题，我们会尽快回复。',
    working_hours_enabled: false,
    working_hours: { start: '09:00', end: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
    offline_message: '当前为非工作时间，我们会在工作时间内回复。',
    auto_reply_enabled: false,
    auto_reply_message: '已收到您的消息，客服会尽快回复。',
  },
  quick_replies: [{ id: 'greet', title: '问候', content: '您好，很高兴为您服务，请描述您遇到的问题。', attachments: [], enabled: true }],
  attachments: {
    enabled: true,
    max_count_per_message: 6,
    max_total_mb_per_message: 30,
    types: {
      image: {
        enabled: true,
        extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'],
        max_upload_mb: 10,
        compress: true,
        max_compressed_mb: 3,
        max_edge: 1920,
        quality: 82,
      },
      document: {
        enabled: true,
        extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.zip', '.rar', '.7z'],
        max_upload_mb: 20,
        compress: false,
      },
      video: { enabled: false, extensions: ['.mp4', '.mov', '.webm'], max_upload_mb: 30, compress: false },
      audio: { enabled: false, extensions: ['.mp3', '.m4a', '.wav', '.ogg'], max_upload_mb: 20, compress: false },
    },
  },
  limits: {
    max_subject_length: 60,
    max_content_length: 2000,
    max_messages_per_minute: 12,
    send_cooldown_seconds: 1,
    max_open_conversations_per_user: 3,
    auto_close_days: 7,
    allow_reopen: true,
    max_message_page_size: 50,
  },
  badge: { enabled: true, max_display: 99, show_on_floating: true },
  admin: { notify_enabled: false, notify_bark: false, notify_email: false, notify_email_to: '', default_filter: 'unread', page_size: 20 },
};

const record = (value: unknown): JsonRecord => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {});
const mergeRecord = (fallback: JsonRecord, source: unknown): JsonRecord => ({ ...fallback, ...record(source) });
const integer = (value: number | undefined) => Math.trunc(value || 0);

const normalizeConfig = (source: unknown): JsonRecord => {
  const raw = record(source);
  const defaults = DEFAULT_CONFIG;
  const attachments = mergeRecord(record(defaults.attachments), raw.attachments);
  const attachmentTypes = mergeRecord(record(record(defaults.attachments).types), attachments.types);
  KINDS.forEach(({ key }) => {
    attachmentTypes[key] = mergeRecord(record(record(record(defaults.attachments).types)[key]), attachmentTypes[key]);
  });
  attachments.types = attachmentTypes;
  const welcome = mergeRecord(record(defaults.welcome), raw.welcome);
  welcome.working_hours = mergeRecord(record(record(defaults.welcome).working_hours), welcome.working_hours);
  return {
    ...defaults,
    ...raw,
    scope: mergeRecord(record(defaults.scope), raw.scope),
    entry: mergeRecord(record(defaults.entry), raw.entry),
    categories: Array.isArray(raw.categories)
      ? raw.categories.map((item) => mergeRecord({ id: '', name: '', enabled: true, description: '' }, item))
      : defaults.categories,
    welcome,
    quick_replies: Array.isArray(raw.quick_replies)
      ? raw.quick_replies.map((item) => mergeRecord({ id: '', title: '', content: '', attachments: [], enabled: true }, item))
      : defaults.quick_replies,
    attachments,
    limits: mergeRecord(record(defaults.limits), raw.limits),
    badge: mergeRecord(record(defaults.badge), raw.badge),
    admin: mergeRecord(record(defaults.admin), raw.admin),
  };
};

export const CustomerServiceConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [extensionInputs, setExtensionInputs] = useState<Partial<Record<AttachmentKind, string>>>({});
  const quickReplyImageInput = useRef<HTMLInputElement>(null);
  const [quickReplyImageIndex, setQuickReplyImageIndex] = useState<number | null>(null);
  const [quickReplyImageUploading, setQuickReplyImageUploading] = useState(false);
  const parsed = useMemo(() => {
    try {
      return { config: normalizeConfig(JSON.parse(value || '{}')), error: '' };
    } catch {
      return { config: normalizeConfig({}), error: '现有在线客服配置不是合法 JSON，请切换原始 JSON 修复。' };
    }
  }, [value]);
  const config = parsed.config;
  const section = (key: string) => record(config[key]);
  const emit = (patch: JsonRecord) => onChange(JSON.stringify({ ...config, ...patch }, null, 2));
  const patchSection = (key: string, patch: JsonRecord) => emit({ [key]: { ...section(key), ...patch } });
  const updateCategory = (index: number, patch: JsonRecord) =>
    emit({ categories: (config.categories as JsonRecord[]).map((item, current) => (current === index ? { ...item, ...patch } : item)) });
  const updateReply = (index: number, patch: JsonRecord) =>
    emit({
      quick_replies: (config.quick_replies as JsonRecord[]).map((item, current) => (current === index ? { ...item, ...patch } : item)),
    });
  const fileData = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.readAsDataURL(file);
    });
  const uploadQuickReplyImages = async (files: FileList | null) => {
    if (quickReplyImageIndex === null || !files?.length) return;
    const reply = (config.quick_replies as JsonRecord[])[quickReplyImageIndex];
    const existing = Array.isArray(reply.attachments) ? reply.attachments.map(record) : [];
    if (existing.length + files.length > 4) return;
    setQuickReplyImageUploading(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        uploaded.push(await adminApiService.uploadCsQuickReplyImage({
          data_base64: await fileData(file),
          filename: file.name,
          mime_type: file.type,
        }));
      }
      updateReply(quickReplyImageIndex, { attachments: [...existing, ...uploaded.map(({ id, name, mime_type }) => ({ id, name, mime_type }))] });
    } finally {
      setQuickReplyImageUploading(false);
      setQuickReplyImageIndex(null);
    }
  };
  const attachmentTypes = record(section('attachments').types);
  const updateType = (kind: AttachmentKind, patch: JsonRecord) =>
    patchSection('attachments', { types: { ...attachmentTypes, [kind]: { ...record(attachmentTypes[kind]), ...patch } } });
  const addExtension = (kind: AttachmentKind) => {
    const extension = (extensionInputs[kind] || '').trim().toLowerCase();
    const current = ((record(attachmentTypes[kind]).extensions as unknown[]) || []).map(String);
    if (!extension || current.includes(extension)) return;
    updateType(kind, { extensions: [...current, extension] });
    setExtensionInputs((inputs) => ({ ...inputs, [kind]: '' }));
  };
  const numeric = (
    label: string,
    value: unknown,
    onValueChange: (next: number) => void,
    options?: { min?: number; max?: number; description?: string }
  ) => (
    <NumberInput
      label={label}
      value={Number(value) || 0}
      minValue={options?.min}
      maxValue={options?.max}
      description={options?.description}
      onValueChange={(next) => onValueChange(integer(next))}
      isDisabled={disabled}
    />
  );

  const scope = section('scope');
  const entry = section('entry');
  const welcome = section('welcome');
  const workingHours = record(welcome.working_hours);
  const attachments = section('attachments');
  const limits = section('limits');
  const badge = section('badge');
  const admin = section('admin');

  return (
    <div className="space-y-6">
      {parsed.error && <Alert color="danger" title="在线客服配置需要修复" description={parsed.error} />}
      <Alert
        color={config.enabled === true ? 'success' : 'default'}
        variant="flat"
        title="在线客服总开关"
        description="开启后用户侧使用内置客服（需把“客服提供方”设为“内置客服”）。关闭时不影响“沿用 Chatwoot”的既有入口。"
        endContent={
          <Switch
            aria-label="在线客服总开关"
            isSelected={config.enabled === true}
            onValueChange={(enabled) => emit({ enabled })}
            isDisabled={disabled}
          />
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="客服提供方"
          selectedKeys={[String(config.provider)]}
          onSelectionChange={(keys) => emit({ provider: String(Array.from(keys)[0] || 'builtin') })}
          isDisabled={disabled}
        >
          <SelectItem key="builtin">内置客服</SelectItem>
          <SelectItem key="chatwoot">沿用 Chatwoot</SelectItem>
          <SelectItem key="off">关闭</SelectItem>
        </Select>
        <div className="space-y-2">
          <p className="text-sm font-medium">可用站点范围</p>
          <div className="flex flex-wrap gap-4">
            <Switch
              isSelected={scope.self_site === true}
              onValueChange={(self_site) => patchSection('scope', { self_site })}
              isDisabled={disabled}
            >
              自营
            </Switch>
            <Switch
              isSelected={scope.whitelabel === true}
              onValueChange={(whitelabel) => patchSection('scope', { whitelabel })}
              isDisabled={disabled}
            >
              白牌
            </Switch>
            <Switch
              isSelected={scope.distributor === true}
              onValueChange={(distributor) => patchSection('scope', { distributor })}
              isDisabled={disabled}
            >
              分销商
            </Switch>
          </div>
        </div>
      </div>
      <section className="space-y-3 rounded-medium border border-divider p-4">
        <h3 className="font-medium">入口设置</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Switch
            isSelected={entry.tab_enabled === true}
            onValueChange={(tab_enabled) => patchSection('entry', { tab_enabled })}
            isDisabled={disabled}
          >
            启用个人中心 Tab
          </Switch>
          <Input
            label="Tab 文案"
            value={String(entry.tab_label)}
            onValueChange={(tab_label) => patchSection('entry', { tab_label })}
            isDisabled={disabled}
          />
          <Switch
            isSelected={entry.floating_enabled === true}
            onValueChange={(floating_enabled) => patchSection('entry', { floating_enabled })}
            isDisabled={disabled}
          >
            启用悬浮入口
          </Switch>
          <Select
            label="悬浮位置"
            selectedKeys={[String(entry.floating_position)]}
            onSelectionChange={(keys) => patchSection('entry', { floating_position: String(Array.from(keys)[0] || 'right') })}
            isDisabled={disabled}
          >
            <SelectItem key="right">右侧</SelectItem>
            <SelectItem key="left">左侧</SelectItem>
          </Select>
          <Input
            label="悬浮气泡文案"
            value={String(entry.floating_bubble)}
            onValueChange={(floating_bubble) => patchSection('entry', { floating_bubble })}
            isDisabled={disabled}
          />
          <Switch
            isSelected={entry.guest_enabled === true}
            onValueChange={(guest_enabled) => patchSection('entry', { guest_enabled })}
            isDisabled={disabled}
          >
            启用游客入口
          </Switch>
          <Input
            className="md:col-span-2"
            label="游客登录提示"
            value={String(entry.guest_login_hint)}
            onValueChange={(guest_login_hint) => patchSection('entry', { guest_login_hint })}
            isDisabled={disabled}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">咨询分类</h3>
          <Button
            size="sm"
            variant="flat"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() =>
              emit({ categories: [...(config.categories as JsonRecord[]), { id: '', name: '', description: '', enabled: true }] })
            }
            isDisabled={disabled}
          >
            新增分类
          </Button>
        </div>
        {(config.categories as JsonRecord[]).map((category, index) => (
          <div
            key={`${String(category.id)}-${index}`}
            className="grid gap-3 rounded-medium border border-divider p-4 md:grid-cols-[1fr_1fr_2fr_auto_auto]"
          >
            <Input label="ID" value={String(category.id)} onValueChange={(id) => updateCategory(index, { id })} isDisabled={disabled} />
            <Input
              label="名称"
              value={String(category.name)}
              onValueChange={(name) => updateCategory(index, { name })}
              isDisabled={disabled}
            />
            <Input
              label="描述"
              value={String(category.description)}
              onValueChange={(description) => updateCategory(index, { description })}
              isDisabled={disabled}
            />
            <Switch
              isSelected={category.enabled === true}
              onValueChange={(enabled) => updateCategory(index, { enabled })}
              isDisabled={disabled}
            >
              启用
            </Switch>
            <Button
              isIconOnly
              color="danger"
              variant="light"
              aria-label={`删除分类 ${index + 1}`}
              onPress={() => emit({ categories: (config.categories as JsonRecord[]).filter((_, current) => current !== index) })}
              isDisabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-medium border border-divider p-4">
        <h3 className="font-medium">欢迎语与自动回复</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="标题"
            value={String(welcome.title)}
            onValueChange={(title) => patchSection('welcome', { title })}
            isDisabled={disabled}
          />
          <Switch
            isSelected={welcome.working_hours_enabled === true}
            onValueChange={(working_hours_enabled) => patchSection('welcome', { working_hours_enabled })}
            isDisabled={disabled}
          >
            启用工作时间
          </Switch>
          <Textarea
            className="md:col-span-2"
            label="欢迎语"
            value={String(welcome.message)}
            onValueChange={(message) => patchSection('welcome', { message })}
            minRows={2}
            isDisabled={disabled}
          />
          <Input
            type="time"
            label="工作开始时间"
            value={String(workingHours.start)}
            onValueChange={(start) => patchSection('welcome', { working_hours: { ...workingHours, start } })}
            isDisabled={disabled}
          />
          <Input
            type="time"
            label="工作结束时间"
            value={String(workingHours.end)}
            onValueChange={(end) => patchSection('welcome', { working_hours: { ...workingHours, end } })}
            isDisabled={disabled}
          />
          <Textarea
            className="md:col-span-2"
            label="非工作时间文案"
            value={String(welcome.offline_message)}
            onValueChange={(offline_message) => patchSection('welcome', { offline_message })}
            minRows={2}
            isDisabled={disabled}
          />
          <Switch
            isSelected={welcome.auto_reply_enabled === true}
            onValueChange={(auto_reply_enabled) => patchSection('welcome', { auto_reply_enabled })}
            isDisabled={disabled}
          >
            启用自动回复
          </Switch>
          <Textarea
            label="自动回复文案"
            value={String(welcome.auto_reply_message)}
            onValueChange={(auto_reply_message) => patchSection('welcome', { auto_reply_message })}
            minRows={2}
            isDisabled={disabled}
          />
        </div>
      </section>

      <div className="space-y-2">
        <p className="text-sm font-medium">工作日</p>
        <div className="flex flex-wrap gap-3">
          {[
            ['1', '周一'],
            ['2', '周二'],
            ['3', '周三'],
            ['4', '周四'],
            ['5', '周五'],
            ['6', '周六'],
            ['7', '周日'],
          ].map(([day, label]) => {
            const dayNumber = Number(day);
            const days = Array.isArray(workingHours.days) ? workingHours.days.map(Number) : [];
            return (
              <Switch
                key={day}
                size="sm"
                isSelected={days.includes(dayNumber)}
                onValueChange={(selected) =>
                  patchSection('welcome', {
                    working_hours: {
                      ...workingHours,
                      days: selected ? [...days, dayNumber].sort((a, b) => a - b) : days.filter((item) => item !== dayNumber),
                    },
                  })
                }
                isDisabled={disabled}
              >
                {label}
              </Switch>
            );
          })}
        </div>
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">客服快捷回复</h3>
          <Button
            size="sm"
            variant="flat"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() =>
              emit({ quick_replies: [...(config.quick_replies as JsonRecord[]), { id: '', title: '', content: '', attachments: [], enabled: true }] })
            }
            isDisabled={disabled}
          >
            新增快捷回复
          </Button>
        </div>
        <input
          ref={quickReplyImageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            void uploadQuickReplyImages(event.target.files);
            event.target.value = '';
          }}
        />
        {(config.quick_replies as JsonRecord[]).map((reply, index) => (
          <div key={`${String(reply.id)}-${index}`} className="space-y-3 rounded-medium border border-divider p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto_auto]">
              <Input label="ID" value={String(reply.id)} onValueChange={(id) => updateReply(index, { id })} isDisabled={disabled} />
              <Input label="标题" value={String(reply.title)} onValueChange={(title) => updateReply(index, { title })} isDisabled={disabled} />
              <Textarea label="内容" value={String(reply.content)} onValueChange={(content) => updateReply(index, { content })} minRows={1} isDisabled={disabled} />
              <Switch isSelected={reply.enabled === true} onValueChange={(enabled) => updateReply(index, { enabled })} isDisabled={disabled}>
                启用
              </Switch>
              <Button isIconOnly color="danger" variant="light" aria-label={`删除快捷回复 ${index + 1}`} onPress={() => emit({ quick_replies: (config.quick_replies as JsonRecord[]).filter((_, current) => current !== index) })} isDisabled={disabled}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(Array.isArray(reply.attachments) ? reply.attachments : []).map((item, attachmentIndex) => {
                const attachment = record(item);
                return (
                  <div key={String(attachment.id)} className="relative overflow-hidden rounded-lg border border-divider">
                    <Image src={adminApiService.csAttachmentUrl(String(attachment.id))} alt={`快捷回复图片${attachmentIndex + 1}`} className="h-20 w-20 object-cover" />
                    <Button isIconOnly size="sm" color="danger" className="absolute right-1 top-1 h-6 min-w-6" aria-label={`删除快捷回复图片 ${attachmentIndex + 1}`} onPress={() => updateReply(index, { attachments: (reply.attachments as unknown[]).filter((_, current) => current !== attachmentIndex) })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              <Button size="sm" variant="flat" isLoading={quickReplyImageUploading && quickReplyImageIndex === index} isDisabled={disabled || (Array.isArray(reply.attachments) && reply.attachments.length >= 4)} startContent={<ImagePlus className="h-4 w-4" />} onPress={() => { setQuickReplyImageIndex(index); window.setTimeout(() => quickReplyImageInput.current?.click(), 0); }}>
                添加图片
              </Button>
            </div>
            <p className="text-xs text-default-400">最多 4 张，可仅图片或图文混合；图片独立存储，不占用配置 JSON。</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-medium border border-divider p-4">
        <h3 className="font-medium">附件设置</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Switch
            isSelected={attachments.enabled === true}
            onValueChange={(enabled) => patchSection('attachments', { enabled })}
            isDisabled={disabled}
          >
            允许附件
          </Switch>
          {numeric(
            '单条最大附件数量',
            attachments.max_count_per_message,
            (max_count_per_message) => patchSection('attachments', { max_count_per_message }),
            { min: 1, max: 10 }
          )}
          {numeric(
            '单条附件总大小（MB）',
            attachments.max_total_mb_per_message,
            (max_total_mb_per_message) => patchSection('attachments', { max_total_mb_per_message }),
            { min: 1, max: 100 }
          )}
        </div>
        {KINDS.map(({ key, label }) => {
          const type = record(attachmentTypes[key]);
          const extensions = Array.isArray(type.extensions) ? type.extensions.map(String) : [];
          return (
            <div key={key} className="space-y-3 border-t border-divider pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <strong>{label}</strong>
                <Switch isSelected={type.enabled === true} onValueChange={(enabled) => updateType(key, { enabled })} isDisabled={disabled}>
                  启用{label}
                </Switch>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  className="max-w-xs"
                  label={`${label}扩展名`}
                  placeholder=".pdf"
                  value={extensionInputs[key] || ''}
                  onValueChange={(next) => setExtensionInputs((inputs) => ({ ...inputs, [key]: next }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addExtension(key);
                    }
                  }}
                  isDisabled={disabled}
                />
                <Button variant="flat" onPress={() => addExtension(key)} isDisabled={disabled}>
                  添加
                </Button>
                {extensions.map((extension) => (
                  <Chip key={extension} onClose={() => updateType(key, { extensions: extensions.filter((item) => item !== extension) })}>
                    {extension}
                  </Chip>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {numeric('单文件上限（MB）', type.max_upload_mb, (max_upload_mb) => updateType(key, { max_upload_mb }), {
                  min: 1,
                  max: 100,
                })}
                {key === 'image' && (
                  <>
                    <Switch
                      isSelected={type.compress === true}
                      onValueChange={(compress) => updateType(key, { compress })}
                      isDisabled={disabled}
                    >
                      压缩图片
                    </Switch>
                    {numeric('压缩后上限（MB）', type.max_compressed_mb, (max_compressed_mb) => updateType(key, { max_compressed_mb }), {
                      min: 1,
                      max: 20,
                    })}
                    {numeric('最大边长', type.max_edge, (max_edge) => updateType(key, { max_edge }), { min: 320, max: 4096 })}
                    {numeric('压缩质量', type.quality, (quality) => updateType(key, { quality }), { min: 40, max: 95 })}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-medium border border-divider p-4">
        <h3 className="font-medium">限制与角标</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {numeric('主题最大长度', limits.max_subject_length, (max_subject_length) => patchSection('limits', { max_subject_length }), {
            min: 1,
            max: 120,
          })}
          {numeric('消息最大长度', limits.max_content_length, (max_content_length) => patchSection('limits', { max_content_length }), {
            min: 1,
            max: 5000,
          })}
          {numeric(
            '每分钟消息数',
            limits.max_messages_per_minute,
            (max_messages_per_minute) => patchSection('limits', { max_messages_per_minute }),
            { min: 1, max: 120 }
          )}
          {numeric(
            '发送冷却（秒）',
            limits.send_cooldown_seconds,
            (send_cooldown_seconds) => patchSection('limits', { send_cooldown_seconds }),
            { min: 0, max: 60 }
          )}
          {numeric(
            '并发开放会话数',
            limits.max_open_conversations_per_user,
            (max_open_conversations_per_user) => patchSection('limits', { max_open_conversations_per_user }),
            { min: 1, max: 20 }
          )}
          {numeric('自动关闭天数', limits.auto_close_days, (auto_close_days) => patchSection('limits', { auto_close_days }), {
            min: 0,
            max: 365,
            description: '0 表示不自动关闭',
          })}
          <Switch
            isSelected={limits.allow_reopen === true}
            onValueChange={(allow_reopen) => patchSection('limits', { allow_reopen })}
            isDisabled={disabled}
          >
            允许重开
          </Switch>
          {numeric(
            '消息单页数量',
            limits.max_message_page_size,
            (max_message_page_size) => patchSection('limits', { max_message_page_size }),
            { min: 10, max: 100 }
          )}
          <Switch isSelected={badge.enabled === true} onValueChange={(enabled) => patchSection('badge', { enabled })} isDisabled={disabled}>
            启用未读角标
          </Switch>
          {numeric('角标显示上限', badge.max_display, (max_display) => patchSection('badge', { max_display }), { min: 1, max: 999 })}
          <Switch
            isSelected={badge.show_on_floating === true}
            onValueChange={(show_on_floating) => patchSection('badge', { show_on_floating })}
            isDisabled={disabled}
          >
            悬浮入口显示角标
          </Switch>
        </div>
      </section>

      <section className="space-y-3 rounded-medium border border-divider p-4">
        <h3 className="font-medium">管理端偏好</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Switch
            isSelected={admin.notify_enabled === true}
            onValueChange={(notify_enabled) => patchSection('admin', { notify_enabled })}
            isDisabled={disabled}
          >
            启用通知
          </Switch>
          <Switch
            isSelected={admin.notify_bark === true}
            onValueChange={(notify_bark) => patchSection('admin', { notify_bark })}
            isDisabled={disabled}
          >
            Bark 通知
          </Switch>
          <Switch
            isSelected={admin.notify_email === true}
            onValueChange={(notify_email) => patchSection('admin', { notify_email })}
            isDisabled={disabled}
          >
            邮件通知
          </Switch>
          <Input
            label="邮件通知收件人"
            value={String(admin.notify_email_to ?? '')}
            onValueChange={(notify_email_to) => patchSection('admin', { notify_email_to })}
            isDisabled={disabled}
            description="留空则不发邮件"
          />
          <Select
            label="默认筛选"
            selectedKeys={[String(admin.default_filter)]}
            onSelectionChange={(keys) => patchSection('admin', { default_filter: String(Array.from(keys)[0] || 'unread') })}
            isDisabled={disabled}
          >
            <SelectItem key="all">全部</SelectItem>
            <SelectItem key="unread">未读</SelectItem>
            <SelectItem key="awaiting">待回复</SelectItem>
            <SelectItem key="open">开放</SelectItem>
            <SelectItem key="processing">处理中</SelectItem>
            <SelectItem key="resolved">已解决</SelectItem>
            <SelectItem key="closed">已关闭</SelectItem>
          </Select>
          {numeric('管理端每页数量', admin.page_size, (page_size) => patchSection('admin', { page_size }), { min: 5, max: 100 })}
        </div>
      </section>
    </div>
  );
};
