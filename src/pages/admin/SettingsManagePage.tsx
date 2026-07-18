import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Input,
    Button,
    Card,
    CardBody,
    Alert,
    Textarea,
    Switch,
    Divider,
    Spinner,
    Autocomplete,
    AutocompleteItem,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    useDisclosure,
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
    Bell,
    Search,
} from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { SystemConfig, UpdateConfigRequest } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { CompensationConfigEditor } from './CompensationConfigEditor';

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
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [packageLevels, setPackageLevels] = useState<Array<{ level: string; category: string }>>([]);
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
    const groupKeys = useMemo(() => Object.keys(groupedConfigs), [groupedConfigs]);

    const filterGroups = useCallback((textValue: string, inputValue: string) => {
        const query = inputValue.trim().toLocaleLowerCase();
        if (!query) return true;

        const groupConfigs = groupedConfigs[textValue] || [];
        return textValue.toLocaleLowerCase().includes(query)
            || groupConfigs.some((config) => (
                config.key.toLocaleLowerCase().includes(query)
                || config.description.toLocaleLowerCase().includes(query)
            ));
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
            '系统设置': <Globe className="w-5 h-5" />,
            '管理员设置': <User className="w-5 h-5" />,
            '用户管理': <Mail className="w-5 h-5" />,
            '支付设置': <CreditCard className="w-5 h-5" />,
            '安全设置': <Shield className="w-5 h-5" />,
            '通知设置': <Bell className="w-5 h-5" />,
        };
        return iconMap[group] || <Settings className="w-5 h-5" />;
    };

    // 渲染配置输入组件
    const renderConfigInput = (config: SystemConfig) => {
        const value = configValues[config.key] || '';
        const isChanged = value !== config.value;
        const isJson = config.type === 'json';
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
                        isSelected={value === 'true'}
                        onValueChange={(selected) => updateConfigValue(config.key, selected ? 'true' : 'false')}
                        isDisabled={!config.editable}
                        color={isChanged ? 'warning' : 'primary'}
                    />
                </div>
            );
        }

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium">{config.description}</div>
                        <div className="text-sm text-default-500">配置键: {config.key}</div>
                    </div>
                    {config.editable && isChanged && (
                        <div className="flex items-center gap-2">
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
                                onPress={() => {
                                    // 取消改动，恢复到原始值
                                    setConfigValues((prev) => ({
                                        ...prev,
                                        [config.key]: config.value,
                                    }));
                                }}
                            >
                                取消
                            </Button>
                        </div>
                    )}
                </div>

                {(config.key === 'NOTICE' || config.key.startsWith('SUBSCRIPTION_NOTICE_')) ? (
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
                ) : config.key === 'COMPENSATION_CONFIG' ? (
                    <CompensationConfigEditor
                        value={value}
                        onChange={(json) => updateConfigValue(config.key, json)}
                        disabled={!config.editable}
                        levelOptions={packageLevels}
                    />
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

            {/* 配置说明 */}
            <Alert
                isVisible
                color="warning"
                title="谨慎修改系统配置"
                description="黄色输入框表示已修改但未保存；禁用的输入框不可编辑。保存只作用于当前分类，JSON 配置会在提交前校验格式。"
            />

            {/* 支持按分组名、配置说明或配置键查找所在分组 */}
            <Card>
                <CardBody className="gap-3">
                    <div>
                        <p className="font-medium text-foreground">配置分组</p>
                        <p className="text-sm text-default-500">输入分组名，或直接搜索配置说明和配置键，快速定位所在分组。</p>
                    </div>
                    <Autocomplete
                        aria-label="查找配置分组"
                        label="查找配置分组"
                        placeholder="例如：通知、SMTP、WHITE_LABEL_CONFIG"
                        selectedKey={selectedGroup || null}
                        onSelectionChange={(key) => {
                            if (key != null) setSelectedGroup(String(key));
                        }}
                        defaultFilter={filterGroups}
                        menuTrigger="focus"
                        isClearable={false}
                        startContent={<Search className="h-4 w-4 text-default-400" />}
                        description={`共 ${groupKeys.length} 个分组，当前分组有 ${groupedConfigs[selectedGroup]?.length || 0} 项配置`}
                        className="w-full max-w-2xl"
                    >
                        {groupKeys.map((group) => (
                            <AutocompleteItem key={group} textValue={group}>
                                <div className="flex w-full items-center gap-2">
                                    {getGroupIcon(group)}
                                    <span className="flex-1">{group}</span>
                                    <span className="text-sm text-default-500">{groupedConfigs[group]?.length || 0} 项</span>
                                </div>
                            </AutocompleteItem>
                        ))}
                    </Autocomplete>
                </CardBody>
            </Card>

            {/* 配置列表：当前分组 */}
            <div className="space-y-4">
                {(groupedConfigs[selectedGroup] || []).map((config, index, arr) => (
                    <div key={config.key}>
                        {renderConfigInput(config)}
                        {index < arr.length - 1 && <Divider className="my-4" />}
                    </div>
                ))}
            </div>

            {/* 操作提示 */}
            {hasChanges && (
                <Alert
                    isVisible
                    color="warning"
                    icon={<Bell className="w-4 h-4" />}
                    title="当前分类有未保存的更改"
                    description="切换分类前请保存，否则本页刷新后更改会丢失。"
                />
            )}

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
                                    <div className="break-all">新值：{pendingConfig?.value}</div>
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
