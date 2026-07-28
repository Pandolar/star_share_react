import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Input,
    Button,
    Textarea,
    Switch,
    Divider,
    Spinner,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    useDisclosure,
    Tabs,
    Tab,
    Chip,
    Select,
    SelectItem,
} from '@heroui/react';
import {
    Settings,
    Save,
    RefreshCw,
    Globe,
    User,
    Mail,
    CreditCard,
    Shield,
} from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { SystemConfig, UpdateConfigRequest } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { CompensationConfigEditor } from './CompensationConfigEditor';
import { PromotionCodeConfigEditor } from './PromotionCodeConfigEditor';
import { BillRuleConfigEditor } from './BillRuleConfigEditor';
import { InvoiceConfigEditor } from './InvoiceConfigEditor';
import { InvitePolicyConfigEditor } from './InvitePolicyConfigEditor';
import { SpeedTestNodesEditor } from './SpeedTestNodesEditor';
import { WhiteLabelConfigEditor } from './WhiteLabelConfigEditor';
import { BarkConfigEditor } from './BarkConfigEditor';
import { DistributorLevelDiscountsEditor } from './DistributorLevelDiscountsEditor';
import { HomeInfoConfigEditor } from './HomeInfoConfigEditor';
const VISUAL_CONFIG_KEYS: Record<string, true> = {
    SPEEDTEST_URL_LIST: true,
    HOME_INFO: true,
    SEND_BARK_CONFIG: true,
    DISTRIBUTOR_LEVEL_DISCOUNTS: true,
    WHITE_LABEL_CONFIG: true,
    INVOICE_CONFIG: true,
    INVITE_POLICY: true,
    PROMOTION_CODE_CONFIG: true,
    COMPENSATION_CONFIG: true,
    BILL_RULE: true,
};

/**
 * 系统配置管理页面
 * 提供系统配置的查看和编辑功能
 */
const SettingsManagePage: React.FC = () => {
    // 状态管理
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [configValues, setConfigValues] = useState<Record<string, string>>({});
    const [rawJsonConfigKeys, setRawJsonConfigKeys] = useState<Set<string>>(() => new Set());
    const [reloadingLimit, setReloadingLimit] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [packageLevels, setPackageLevels] = useState<Array<{ level: string; category: string }>>([]);
    const [packageOptions, setPackageOptions] = useState<Array<{ id: number; package_name: string; category: string; level: string }>>([]);
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onOpenChange: onConfirmOpenChange } = useDisclosure();
    const [pendingConfig, setPendingConfig] = useState<{ key: string; value: string; description: string } | null>(null);

    // 获取系统配置
    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminApiService.getConfigs();
            if (response.code === 20000) {
                const list: SystemConfig[] = Array.isArray(response.data) ? response.data : [];
                setConfigs(list);
                // 初始化配置值
                const values: Record<string, string> = {};
                list.forEach((config) => {
                    values[config.key] = config.value;
                });
                setConfigValues(values);
            } else {
                showToast(response.msg || '获取系统配置失败', 'error');
            }
        } catch {
            showToast('获取系统配置失败', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始化
    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    // 加载套餐等级（补偿活动固定等级下拉用，去重）
    useEffect(() => {
        (async () => {
            try {
                const resp = await adminApiService.getPackages({ page_size: 1000 });
                if (resp.code === 20000 && Array.isArray(resp.data)) {
                    const seen = new Set<string>();
                    const levels: Array<{ level: string; category: string }> = [];
                    setPackageOptions(resp.data.map((item) => ({
                        id: item.id,
                        package_name: item.package_name,
                        category: item.category,
                        level: item.level,
                    })));
                    resp.data.forEach((p) => {
                        const key = `${p.level}|${p.category}`;
                        if (p.level && p.category && !seen.has(key)) {
                            seen.add(key);
                            levels.push({ level: p.level, category: p.category });
                        }
                    });
                    setPackageLevels(levels);
                }
            } catch {
                showToast('加载补偿套餐选项失败', 'error');
            }
        })();
    }, []);

    // 更新配置值
    const updateConfigValue = (key: string, value: string) => {
        setConfigValues(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const toggleConfigMode = (key: string) => {
        setRawJsonConfigKeys((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const reloadLimitConfig = async () => {
        const savedValue = configs.find((config) => config.key === 'BILL_RULE')?.value;
        if (savedValue !== undefined && configValues.BILL_RULE !== savedValue) {
            showToast('请先保存计费限速规则，再刷新限速器', 'warning');
            return;
        }
        setReloadingLimit(true);
        try {
            const response = await adminApiService.reloadLimitConfig();
            if (response.code !== 20000) throw new Error(response.msg || '刷新限速器失败');
            showToast(response.msg || '限速器已重新加载', 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : '刷新限速器失败', 'error');
        } finally {
            setReloadingLimit(false);
        }
    };

    // 保存单个配置
    const saveConfig = async (key: string, value: string) => {
        try {
            const updateData: UpdateConfigRequest = { key, value };
            const response = await adminApiService.updateConfig(updateData);
            if (response.code === 20000) {
                showToast('配置保存成功', 'success');
                fetchConfigs(); // 重新获取配置
            } else {
                showToast(response.msg || '配置保存失败', 'error');
            }
        } catch {
            showToast('配置保存失败', 'error');
        }
    };

    // 批量保存配置
    const saveAllConfigs = async () => {
        setSaving(true);
        try {
            const scope = selectedGroup ? (groupedConfigs[selectedGroup] || []) : configs;
            const changedConfigs = scope.filter(config =>
                configValues[config.key] !== config.value && config.editable
            );

            if (changedConfigs.length === 0) {
                showToast('没有配置需要保存', 'warning');
                return;
            }

            // JSON 校验：若存在无效 JSON，阻止保存
            const invalidJson = changedConfigs.find(c => c.type === 'json' && (() => {
                try { JSON.parse(configValues[c.key] || ''); return false; } catch { return true; }
            })());
            if (invalidJson) {
                showToast(`配置项 ${invalidJson.description} 的 JSON 格式无效，请修正后再保存`, 'error');
                return;
            }

            const promises = changedConfigs.map(config =>
                adminApiService.updateConfig({
                    key: config.key,
                    value: configValues[config.key]
                })
            );

            const results = await Promise.all(promises);
            const failedCount = results.filter(result => result.code !== 20000).length;

            if (failedCount === 0) {
                showToast(`成功保存${changedConfigs.length}个配置`, 'success');
                fetchConfigs(); // 重新获取配置
            } else {
                showToast(`保存完成，${failedCount}个配置保存失败`, 'warning');
            }
        } catch {
            showToast('批量保存配置失败', 'error');
        } finally {
            setSaving(false);
        }
    };

    // 重置配置
    const resetConfigs = () => {
        if (!selectedGroup) return;
        const values: Record<string, string> = { ...configValues };
        (groupedConfigs[selectedGroup] || []).forEach((config) => {
            values[config.key] = config.value;
        });
        setConfigValues(values);
        showToast('当前分类配置已重置', 'success');
    };

    // 按分组分类配置
    const groupedConfigs = useMemo(() => configs.reduce((groups, config) => {
        const group = config.group || '其他';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(config);
        return groups;
    }, {} as Record<string, SystemConfig[]>), [configs]);

    // 分组列表
    const groupKeys = useMemo(() => {
        const preferredOrder = ['基础设置', '账号与通知', '支付与开票', '套餐与权益', '风控与限速', '外部集成'];
        return [
            ...preferredOrder.filter((group) => groupedConfigs[group]),
            ...Object.keys(groupedConfigs).filter((group) => !preferredOrder.includes(group)).sort(),
        ];
    }, [groupedConfigs]);


    // 初始化选中的分组
    useEffect(() => {
        if (!selectedGroup && groupKeys.length > 0) {
            setSelectedGroup(groupKeys[0]);
        }
    }, [groupKeys, selectedGroup]);

    // 分组图标映射
    const getGroupIcon = (group: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            '基础设置': <Globe className="w-5 h-5" />,
            '账号与通知': <Mail className="w-5 h-5" />,
            '支付与开票': <CreditCard className="w-5 h-5" />,
            '套餐与权益': <User className="w-5 h-5" />,
            '风控与限速': <Shield className="w-5 h-5" />,
            '外部集成': <Settings className="w-5 h-5" />,
        };
        return iconMap[group] || <Settings className="w-5 h-5" />;
    };

    // 渲染配置输入组件
    const renderConfigInput = (config: SystemConfig) => {
        const value = configValues[config.key] || '';
        const isChanged = value !== config.value;
        const isJson = config.type === 'json';
        const supportsModeSwitch = isJson && Boolean(VISUAL_CONFIG_KEYS[config.key]);
        const showRawJson = supportsModeSwitch && rawJsonConfigKeys.has(config.key);
        const isJsonValid = !isJson ? true : (() => {
            try {
                JSON.parse(value || '');
                return true;
            } catch {
                return false;
            }
        })();

        if (config.type === 'bool') {
            return (
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="font-medium">{config.description}</div>
                        <div className="text-sm text-default-500">配置键: {config.key}</div>
                    </div>
                    <Switch
                        isSelected={['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())}
                        onValueChange={(selected) => updateConfigValue(config.key, selected ? 'true' : 'false')}
                        isDisabled={!config.editable}
                        color={isChanged ? 'warning' : 'primary'}
                    />
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                        <div className="font-medium">{config.description}</div>
                        <div className="text-sm text-default-500">配置键: {config.key}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {config.key === 'BILL_RULE' && (
                            <Button
                                size="sm"
                                color="primary"
                                variant="flat"
                                startContent={<RefreshCw className={`w-3 h-3 ${reloadingLimit ? 'animate-spin' : ''}`} />}
                                onPress={reloadLimitConfig}
                                isLoading={reloadingLimit}
                                isDisabled={reloadingLimit}
                            >
                                刷新限速器
                            </Button>
                        )}
                        {supportsModeSwitch && (
                            <Button size="sm" variant="bordered" onPress={() => toggleConfigMode(config.key)}>
                                {showRawJson ? '切换可视化' : '查看原始 JSON'}
                            </Button>
                        )}
                        {config.editable && isChanged && (
                            <>
                                <Button
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    startContent={<Save className="w-3 h-3" />}
                                    isDisabled={!isJsonValid}
                                    onPress={() => {
                                        if (!isJsonValid) {
                                            showToast('JSON 格式无效，请检查后再确认', 'warning');
                                            return;
                                        }
                                        setPendingConfig({ key: config.key, value, description: config.description });
                                        onConfirmOpen();
                                    }}
                                >
                                    确认
                                </Button>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onPress={() => updateConfigValue(config.key, config.value)}
                                >
                                    取消
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {showRawJson ? (
                    <Textarea
                        aria-label={`${config.description} 原始 JSON`}
                        value={value}
                        onValueChange={(nextValue) => updateConfigValue(config.key, nextValue)}
                        isDisabled={!config.editable}
                        variant="bordered"
                        className="font-mono"
                        isInvalid={!isJsonValid}
                        color={!isJsonValid ? 'danger' : isChanged ? 'warning' : 'default'}
                        errorMessage={!isJsonValid ? 'JSON 格式无效' : undefined}
                        minRows={12}
                    />
                ) : config.key === 'HOME_INFO' ? (
                    <HomeInfoConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} />
                ) : config.key === 'SPEEDTEST_URL_LIST' ? (
                    <SpeedTestNodesEditor
                        value={value}
                        onChange={(nextValue) => updateConfigValue(config.key, nextValue)}
                        disabled={!config.editable}
                    />
                ) : config.key === 'SEND_BARK_CONFIG' ? (
                    <BarkConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} />
                ) : config.key === 'DISTRIBUTOR_LEVEL_DISCOUNTS' ? (
                    <DistributorLevelDiscountsEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} packages={packageOptions} />
                ) : (config.key === 'NOTICE' || config.key.startsWith('SUBSCRIPTION_NOTICE_')) ? (
                    <Textarea
                        value={value}
                        onValueChange={(nextValue) => updateConfigValue(config.key, nextValue)}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}（支持Markdown格式）`}
                        minRows={5}
                        description={config.key.startsWith('SUBSCRIPTION_NOTICE_') ? '支持Markdown：标题、列表、**粗体**、链接等' : undefined}
                    />
                ) : config.key === 'PROMOTION_CODE_CONFIG' ? (
                    <PromotionCodeConfigEditor
                        value={value}
                        onChange={(json) => updateConfigValue(config.key, json)}
                        disabled={!config.editable}
                        packages={packageOptions}
                    />
                ) : config.key === 'COMPENSATION_CONFIG' ? (
                    <CompensationConfigEditor
                        value={value}
                        onChange={(json) => updateConfigValue(config.key, json)}
                        disabled={!config.editable}
                        levelOptions={packageLevels}
                    />
                ) : config.key === 'WHITE_LABEL_CONFIG' ? (
                    <WhiteLabelConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} />
                ) : config.key === 'INVOICE_CONFIG' ? (
                    <InvoiceConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} />
                ) : config.key === 'INVITE_POLICY' ? (
                    <InvitePolicyConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} packages={packageOptions} />
                ) : config.key === 'BILL_RULE' ? (
                    <BillRuleConfigEditor value={value} onChange={(json) => updateConfigValue(config.key, json)} disabled={!config.editable} legacyType={configValues.BILL_RULE_TYPE || 'fixed'} packageLevels={Array.from(new Set(packageLevels.map((item) => item.level)))} />
                ) : config.key === 'BILL_RULE_TYPE' ? (
                    <Select
                        label="旧版规则模式"
                        selectedKeys={[value || 'fixed']}
                        onSelectionChange={(keys) => updateConfigValue(config.key, String(Array.from(keys)[0] || 'fixed'))}
                        isDisabled={!config.editable}
                        description="仅用于转换尚未升级到 v2 的 BILL_RULE；v2 中每条限额可单独选择固定或滑动窗口。"
                        className="max-w-md"
                    >
                        <SelectItem key="fixed">统一限速</SelectItem>
                        <SelectItem key="detailed">按模型明细限速</SelectItem>
                    </Select>
                ) : isJson ? (
                    <Textarea
                        value={value}
                        onValueChange={(nextValue) => updateConfigValue(config.key, nextValue)}
                        isDisabled={!config.editable}
                        variant="bordered"
                        className="font-mono"
                        isInvalid={!isJsonValid}
                        color={!isJsonValid ? 'danger' : isChanged ? 'warning' : 'default'}
                        placeholder={`请输入合法的 JSON（${config.description}）`}
                        minRows={6}
                    />
                ) : config.type === 'int' ? (
                    <NumberInput
                        value={value === '' || Number.isNaN(Number(value)) ? undefined : Number(value)}
                        onValueChange={(nextValue) => updateConfigValue(config.key, Number.isNaN(nextValue) ? '' : String(nextValue))}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}`}
                    />
                ) : (
                    <Input
                        type="text"
                        value={value}
                        onValueChange={(nextValue) => updateConfigValue(config.key, nextValue)}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}`}
                    />
                )}

                {config.required && (
                    <div className="text-xs text-default-500">* 此配置为必填项</div>
                )}
            </div>
        );
    };

    // 当前分组是否有变更
    const hasChanges = useMemo(() => {
        if (!selectedGroup) return false;
        const currentGroup = groupedConfigs[selectedGroup] || [];
        return currentGroup.some(config => configValues[config.key] !== config.value && config.editable);
    }, [groupedConfigs, selectedGroup, configValues]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner size="lg" label="加载配置中..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold text-default-800">系统配置</h1>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="bordered"
                        onPress={resetConfigs}
                        startContent={<RefreshCw className="w-4 h-4" />}
                    >
                        重置
                    </Button>
                    <Button
                        color="primary"
                        onPress={saveAllConfigs}
                        isLoading={saving}
                        isDisabled={!hasChanges}
                        startContent={<Save className="w-4 h-4" />}
                    >
                        {hasChanges ? '保存当前分类' : '无变更'}
                    </Button>
                </div>
            </div>

                    <Tabs
                        aria-label="配置分类"
                        selectedKey={selectedGroup}
                        onSelectionChange={(key) => setSelectedGroup(String(key))}
                        variant="underlined"
                        color="primary"
                        classNames={{ tabList: 'w-full overflow-x-auto', cursor: 'w-full' }}
                    >
                        {groupKeys.map((group) => (
                            <Tab
                                key={group}
                                title={(
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        {getGroupIcon(group)}
                                        <span>{group}</span>
                                        <Chip size="sm" variant="flat">{groupedConfigs[group]?.length || 0}</Chip>
                                    </div>
                                )}
                            />
                        ))}
                    </Tabs>

            {/* 配置列表：当前分组 */}
            <div className="space-y-4">
                {(groupedConfigs[selectedGroup] || []).map((config, index, arr) => (
                    <div key={config.key}>
                        {renderConfigInput(config)}
                        {index < arr.length - 1 && <Divider className="my-4" />}
                    </div>
                ))}
            </div>


            {/* 确认提交弹窗 */}
            <Modal isOpen={isConfirmOpen} onOpenChange={onConfirmOpenChange} placement="center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-2">
                                <Save className="w-4 h-4 text-primary" />
                                <span>确认提交配置</span>
                            </ModalHeader>
                            <ModalBody>
                                <div className="text-sm text-default-700 space-y-1">
                                    <div>即将提交以下配置项：</div>
                                    <div className="font-medium">{pendingConfig?.description}</div>
                                    <div className="text-default-500">键：{pendingConfig?.key}</div>
                                    <div className="break-all">{pendingConfig && VISUAL_CONFIG_KEYS[pendingConfig.key] ? '页面中的可视化配置将按当前值保存。' : `新值：${pendingConfig?.value || ''}`}</div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button
                                    color="primary"
                                    isLoading={saving}
                                    onPress={async () => {
                                        if (pendingConfig) {
                                            await saveConfig(pendingConfig.key, pendingConfig.value);
                                        }
                                        onClose();
                                        setPendingConfig(null);
                                    }}
                                >
                                    确认提交
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default SettingsManagePage; 
