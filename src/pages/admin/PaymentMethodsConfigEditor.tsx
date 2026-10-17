import React, { useMemo } from 'react';
import { Alert, Switch } from '@heroui/react';
import { PaymentMethodIcon, paymentMethodLabel } from '../../components/PaymentMethodSelector';

type PaymentMethodsConfig = { wxpay: boolean; alipay: boolean };
interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }
const DEFAULT_CONFIG: PaymentMethodsConfig = { wxpay: true, alipay: true };

export const PaymentMethodsConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
    const parsed = useMemo(() => {
        if (!value.trim()) return { config: DEFAULT_CONFIG, error: '' };
        try {
            const source: unknown = JSON.parse(value);
            if (!source || typeof source !== 'object' || Array.isArray(source)) {
                return { config: DEFAULT_CONFIG, error: '支付方式配置必须是 JSON 对象。' };
            }
            const object = source as Record<string, unknown>;
            if (Object.keys(object).some((key) => key !== 'wxpay' && key !== 'alipay')) {
                return { config: DEFAULT_CONFIG, error: '支付方式只支持 wxpay 和 alipay。' };
            }
            if ((object.wxpay !== undefined && typeof object.wxpay !== 'boolean') || (object.alipay !== undefined && typeof object.alipay !== 'boolean')) {
                return { config: DEFAULT_CONFIG, error: 'wxpay 和 alipay 必须使用严格的布尔值 true 或 false。' };
            }
            return { config: { wxpay: object.wxpay !== false, alipay: object.alipay !== false }, error: '' };
        } catch {
            return { config: DEFAULT_CONFIG, error: '现有支付方式配置不是合法 JSON，请切换到原始 JSON 修正。' };
        }
    }, [value]);

    const emit = (method: keyof PaymentMethodsConfig, enabled: boolean) => {
        onChange(JSON.stringify({ ...parsed.config, [method]: enabled }, null, 2));
    };
    const methods: Array<keyof PaymentMethodsConfig> = ['wxpay', 'alipay'];
    const closed = !parsed.config.wxpay && !parsed.config.alipay;

    return (
        <div className="space-y-3">
            {parsed.error && <Alert color="danger" title="支付方式配置需要修复" description={parsed.error} />}
            <div className="grid gap-3 sm:grid-cols-2">
                {methods.map((method) => (
                    <div key={method} className="flex items-center justify-between rounded-lg border border-default-200 p-3">
                        <div className="flex items-center gap-2">
                            <PaymentMethodIcon method={method} className="h-5 w-5" />
                            <span className="font-medium">{paymentMethodLabel(method)}支付</span>
                        </div>
                        <Switch
                            aria-label={`${paymentMethodLabel(method)}支付`}
                            isSelected={parsed.config[method]}
                            onValueChange={(enabled) => emit(method, enabled)}
                            isDisabled={disabled || Boolean(parsed.error)}
                        />
                    </div>
                ))}
            </div>
            <div className={`text-sm ${closed ? 'text-danger' : 'text-default-500'}`}>
                {closed ? '已关闭在线支付：个人、团队和配额重置的新支付将不可用。' : '配置应用于个人、团队和配额重置的新支付；已支付订单的回调和状态不受影响。'}
            </div>
            <div className="text-xs text-default-500">修改后请刷新用户页面以更新可用支付方式。</div>
        </div>
    );
};
