import React, { useMemo } from 'react';
import { Alert, Button, Card, CardBody, Divider, Input, NumberInput, Select, SelectItem, Switch } from '@heroui/react';
import { Plus, Trash2, Gift } from 'lucide-react';

/**
 * 补偿活动配置可视化编辑器
 * 接收 JSON 字符串 value，通过 onChange 回传新的 JSON 字符串，
 * 复用系统配置页原有的"变更检测 + 确认保存"流程。
 */

interface Campaign {
    id: string;
    title: string;
    enabled: boolean;
    days: number;
    level_mode: 'fixed' | 'follow';
    fixed_level: string;
    category: string;
    require_active_before: string;
    require_still_active: boolean;
    limit_per_user: number;
    expires_at: string;
}

interface CompensationConfig {
    enabled: boolean;
    campaigns: Campaign[];
}

interface Props {
    value: string;
    onChange: (jsonString: string) => void;
    disabled?: boolean;
    /** 系统中存在的套餐等级，用于固定等级下拉 */
    levelOptions?: Array<{ level: string; category: string }>;
}

const emptyCampaign = (): Campaign => ({
    id: `comp_${Date.now()}`,
    title: '',
    enabled: true,
    days: 1,
    level_mode: 'fixed',
    fixed_level: '',
    category: 'GPT',
    require_active_before: '',
    require_still_active: true,
    limit_per_user: 1,
    expires_at: '',
});

export const CompensationConfigEditor: React.FC<Props> = ({ value, onChange, disabled, levelOptions = [] }) => {
    const config: CompensationConfig = useMemo(() => {
        try {
            const parsed = JSON.parse(value || '{}');
            return {
                enabled: !!parsed.enabled,
                campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
            };
        } catch {
            return { enabled: false, campaigns: [] };
        }
    }, [value]);

    const emit = (next: CompensationConfig) => {
        onChange(JSON.stringify(next));
    };

    const updateConfig = (patch: Partial<CompensationConfig>) => {
        emit({ ...config, ...patch });
    };

    const updateCampaign = (index: number, patch: Partial<Campaign>) => {
        const campaigns = config.campaigns.map((c, i) => (i === index ? { ...c, ...patch } : c));
        emit({ ...config, campaigns });
    };

    const addCampaign = () => {
        emit({ ...config, campaigns: [...config.campaigns, emptyCampaign()] });
    };

    const removeCampaign = (index: number) => {
        emit({ ...config, campaigns: config.campaigns.filter((_, i) => i !== index) });
    };

    return (
        <div className="space-y-4">
            <Alert
                isVisible
                color={config.enabled ? 'success' : 'default'}
                startContent={<Gift className="h-5 w-5" />}
                title="补偿功能总开关"
                description="关闭后所有补偿活动均不展示、不可领取。"
                endContent={(
                    <Switch
                        aria-label="启用补偿功能"
                        isSelected={config.enabled}
                        onValueChange={(value) => updateConfig({ enabled: value })}
                        isDisabled={disabled}
                        color="success"
                    />
                )}
            />

            {/* 活动列表 */}
            {config.campaigns.map((c, index) => (
                <Card key={c.id || index} shadow="sm">
                    <CardBody className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Switch
                                    size="sm"
                                    isSelected={c.enabled}
                                    onValueChange={(v) => updateCampaign(index, { enabled: v })}
                                    isDisabled={disabled}
                                />
                                <span className="text-sm text-default-500">{c.enabled ? '已启用' : '已禁用'}</span>
                            </div>
                            <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                isIconOnly
                                onPress={() => removeCampaign(index)}
                                isDisabled={disabled}
                                aria-label={`删除补偿活动 ${c.title || index + 1}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="活动标题/品相"
                                placeholder="如 20260628维护补偿"
                                value={c.title}
                                onValueChange={(title) => updateCampaign(index, { title })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Input
                                label="活动ID（唯一）"
                                placeholder="如 comp_20260628"
                                value={c.id}
                                onValueChange={(id) => updateCampaign(index, { id })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                                description="修改ID会重置已领取去重，谨慎"
                            />
                            <NumberInput
                                label="补偿天数"
                                value={c.days}
                                onValueChange={(days) => updateCampaign(index, { days })}
                                minValue={1}
                                step={1}
                                isDisabled={disabled}
                                size="sm"
                            />
                            <NumberInput
                                label="每人限领次数"
                                value={c.limit_per_user}
                                onValueChange={(limit_per_user) => updateCampaign(index, { limit_per_user })}
                                minValue={1}
                                step={1}
                                isDisabled={disabled}
                                size="sm"
                            />
                            <Select
                                label="补偿等级模式"
                                selectedKeys={[c.level_mode || 'fixed']}
                                onSelectionChange={(keys) => updateCampaign(index, { level_mode: String(Array.from(keys)[0] || 'fixed') as 'fixed' | 'follow' })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            >
                                <SelectItem key="fixed">固定等级</SelectItem>
                                <SelectItem key="follow">跟随用户最高有效等级</SelectItem>
                            </Select>
                            {c.level_mode === 'fixed' ? (
                                <Select
                                    label="固定补偿等级"
                                    placeholder="选择等级"
                                    selectedKeys={c.fixed_level ? [`${c.fixed_level}|${c.category}`] : []}
                                    onSelectionChange={(keys) => {
                                        const [level, category] = String(Array.from(keys)[0] || '').split('|');
                                        updateCampaign(index, { fixed_level: level || '', category: category || 'GPT' });
                                    }}
                                    isDisabled={disabled}
                                    variant="bordered"
                                    size="sm"
                                >
                                    {levelOptions.map((pl) => (
                                        <SelectItem key={`${pl.level}|${pl.category}`}>
                                            {pl.level}（{pl.category}）
                                        </SelectItem>
                                    ))}
                                </Select>
                            ) : (
                                <Input
                                    label="套餐类别"
                                    placeholder="GPT"
                                    value={c.category}
                                    onValueChange={(category) => updateCampaign(index, { category })}
                                    isDisabled={disabled}
                                    variant="bordered"
                                    size="sm"
                                />
                            )}
                            <Input
                                label="须在此时间前开通会员"
                                placeholder="2026-06-28 00:00:00（空=不限）"
                                value={c.require_active_before}
                                onValueChange={(require_active_before) => updateCampaign(index, { require_active_before })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Input
                                label="活动过期时间"
                                placeholder="2026-07-05 23:59:59（空=不过期）"
                                value={c.expires_at}
                                onValueChange={(expires_at) => updateCampaign(index, { expires_at })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                size="sm"
                                isSelected={c.require_still_active}
                                onValueChange={(v) => updateCampaign(index, { require_still_active: v })}
                                isDisabled={disabled}
                            />
                            <span className="text-sm text-default-600">领取时该等级会员仍须有效</span>
                        </div>
                    </CardBody>
                </Card>
            ))}

            <Divider />
            <Button
                variant="flat"
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={addCampaign}
                isDisabled={disabled}
            >
                新增补偿活动
            </Button>
        </div>
    );
};

export default CompensationConfigEditor;
