import React from 'react';
import { Button, Chip } from '@heroui/react';
import { BadgeCheck, CircleDollarSign, Clock3 } from 'lucide-react';
import type { ChatCard, ChatMessage } from './types';
import { paymentMethodLabel } from '../PaymentMethodSelector';

export interface ChatCardViewProps {
  message: ChatMessage;
  card: ChatCard;
  scope: 'user' | 'admin';
  /** 用户侧点击支付；管理端不传则只展示状态。 */
  onPayCard?: (message: ChatMessage, card: ChatCard) => void;
  paying?: boolean;
}

const STATUS_VIEW: Record<string, { label: string; color: 'default' | 'warning' | 'success' }> = {
  unpaid: { label: '待支付', color: 'warning' },
  pending: { label: '支付中', color: 'warning' },
  paid: { label: '已支付', color: 'success' },
  failed: { label: '已失效', color: 'default' },
};

/**
 * 聊天内组件卡片。新卡片类型在此按 card.kind 增加分支渲染即可，
 * 消息列表与前后端消息结构无需改动。
 */
const ChatCardView: React.FC<ChatCardViewProps> = ({ message, card, scope, onPayCard, paying = false }) => {
  if (card.kind === 'surcharge') {
    const status = STATUS_VIEW[card.status] || STATUS_VIEW.unpaid;
    const paid = card.status === 'paid';
    return (
      <div className="w-64 max-w-full overflow-hidden rounded-xl border border-divider bg-content1 text-left shadow-sm">
        <div className="flex items-center gap-2 border-b border-divider bg-warning-50 px-3 py-2">
          <CircleDollarSign className="h-4 w-4 shrink-0 text-warning" />
          <span className="truncate text-sm font-semibold text-default-800">{card.title || '补差价'}</span>
          <Chip size="sm" variant="flat" color={status.color} className="ml-auto shrink-0">
            {status.label}
          </Chip>
        </div>
        <div className="space-y-1.5 px-3 py-2.5">
          <p className="text-2xl font-bold text-danger">¥{card.amount}</p>
          {card.note && <p className="text-xs leading-5 text-default-500">{card.note}</p>}
          <p className="text-xs text-default-400">
            指定支付方式：{paymentMethodLabel(card.payment_method)}
            {paid && card.paid_at ? ` · ${new Date(card.paid_at).toLocaleString('zh-CN', { hour12: false })}` : ''}
          </p>
          {scope === 'user' && !paid && (
            <Button
              size="sm"
              color="primary"
              className="mt-1 w-full"
              isLoading={paying}
              isDisabled={!onPayCard}
              onPress={() => onPayCard?.(message, card)}
            >
              立即支付
            </Button>
          )}
          {paid && (
            <p className="flex items-center gap-1 text-xs text-success">
              <BadgeCheck className="h-3.5 w-3.5" /> 已收到款项，无需重复支付
            </p>
          )}
          {!paid && card.status === 'pending' && (
            <p className="flex items-center gap-1 text-xs text-default-400">
              <Clock3 className="h-3.5 w-3.5" /> 支付链接 10 分钟内有效，过期可重新点击获取
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default ChatCardView;
