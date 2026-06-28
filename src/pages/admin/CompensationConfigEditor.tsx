import React, { useMemo } from 'react';
import { Card, CardBody, Input, Button, Switch, Select, SelectItem, Divider } from '@heroui/react';
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
            {/* 总开关 */}
            <div className="flex items-center justify-between bg-default-50 rounded-lg p-3">
                <div>
                    <div className="font-medium flex items-center gap-2">
                        <Gift className="w-4 h-4 text-warning" />
                        补偿功能总开关
                    </div>
                    <div className="text-sm text-default-500">关闭后所有补偿活动均不展示、不可领取</div>
                </div>
                <Switch
                    isSelected={config.enabled}
                    onValueChange={(v) => updateConfig({ enabled: v })}
                    isDisabled={disabled}
                    color="success"
                />
            </div>

            {/* 活动列表 */}
            {config.campaigns.map((c, index) => (
                <Card key={index} className="border border-default-200">
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
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="活动标题/品相"
                                placeholder="如 20260628维护补偿"
                                value={c.title}
                                onChange={(e) => updateCampaign(index, { title: e.target.value })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Input
                                label="活动ID（唯一）"
                                placeholder="如 comp_20260628"
                                value={c.id}
                                onChange={(e) => updateCampaign(index, { id: e.target.value })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                                description="修改ID会重置已领取去重，谨慎"
                            />
                            <Input
                                label="补偿天数"
                                type="number"
                                value={String(c.days ?? '')}
                                onChange={(e) => updateCampaign(index, { days: Number(e.target.value) })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Input
                                label="每人限领次数"
                                type="number"
                                value={String(c.limit_per_user ?? 1)}
                                onChange={(e) => updateCampaign(index, { limit_per_user: Number(e.target.value) })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Select
                                label="补偿等级模式"
                                selectedKeys={[c.level_mode || 'fixed']}
                                onChange={(e) => updateCampaign(index, { level_mode: e.target.value as 'fixed' | 'follow' })}
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
                                    onChange={(e) => {
                                        const [level, category] = e.target.value.split('|');
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
                                    onChange={(e) => updateCampaign(index, { category: e.target.value })}
                                    isDisabled={disabled}
                                    variant="bordered"
                                    size="sm"
                                />
                            )}
                            <Input
                                label="须在此时间前开通会员"
                                placeholder="2026-06-28 00:00:00（空=不限）"
                                value={c.require_active_before}
                                onChange={(e) => updateCampaign(index, { require_active_before: e.target.value })}
                                isDisabled={disabled}
                                variant="bordered"
                                size="sm"
                            />
                            <Input
                                label="活动过期时间"
                                placeholder="2026-07-05 23:59:59（空=不过期）"
                                value={c.expires_at}
                                onChange={(e) => updateCampaign(index, { expires_at: e.target.value })}
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
