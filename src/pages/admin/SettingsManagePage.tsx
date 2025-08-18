import React, { useState, useEffect, useCallback } from 'react';
import {
    Input,
    Button,
    Card,
    CardBody,
    CardHeader,
    Textarea,
    Switch,
    Divider,
    Accordion,
    AccordionItem,
    Spinner,
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
} from 'lucide-react';
import adminApiService from '../../services/adminApi';
import { SystemConfig, UpdateConfigRequest } from '../../types/admin';
import { showToast } from '../../components/Toast';

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

    // 获取系统配置
    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminApiService.getConfigs();
            if (response.code === 20000) {
                setConfigs(response.data || []);
                // 初始化配置值
                const values: Record<string, string> = {};
                response.data.forEach((config) => {
                    values[config.key] = config.value;
                });
                setConfigValues(values);
            } else {
                showToast(response.msg || '获取系统配置失败', 'error');
            }
        } catch (error) {
            console.error('获取系统配置失败:', error);
            showToast('获取系统配置失败', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始化
    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

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
        } catch (error) {
            console.error('配置保存失败:', error);
            showToast('配置保存失败', 'error');
        }
    };

    // 批量保存配置
    const saveAllConfigs = async () => {
        setSaving(true);
        try {
            const changedConfigs = configs.filter(config =>
                configValues[config.key] !== config.value && config.editable
            );

            if (changedConfigs.length === 0) {
                showToast('没有配置需要保存', 'warning');
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
        } catch (error) {
            console.error('批量保存配置失败:', error);
            showToast('批量保存配置失败', 'error');
        } finally {
            setSaving(false);
        }
    };

    // 重置配置
    const resetConfigs = () => {
        const values: Record<string, string> = {};
        configs.forEach((config) => {
            values[config.key] = config.value;
        });
        setConfigValues(values);
        showToast('配置已重置', 'success');
    };

    // 按分组分类配置
    const groupedConfigs = configs.reduce((groups, config) => {
        const group = config.group || '其他';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(config);
        return groups;
    }, {} as Record<string, SystemConfig[]>);

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

        if (config.type === 'bool') {
            return (
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="font-medium">{config.description}</div>
                        <div className="text-sm text-gray-500">配置键: {config.key}</div>
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
                        <div className="text-sm text-gray-500">配置键: {config.key}</div>
                    </div>
                    {config.editable && isChanged && (
                        <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<Save className="w-3 h-3" />}
                            onPress={() => saveConfig(config.key, value)}
                        >
                            保存
                        </Button>
                    )}
                </div>

                {config.key.includes('PASSWORD') || config.key.includes('KEY') || config.key.includes('SECRET') ? (
                    <Input
                        type="password"

                        onChange={(e) => updateConfigValue(config.key, e.target.value)}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}`}
                    />
                ) : config.key === 'NOTICE' ? (
                    <Textarea

                        onChange={(e) => updateConfigValue(config.key, e.target.value)}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}`}
                        minRows={3}
                    />
                ) : (
                    <Input

                        onChange={(e) => updateConfigValue(config.key, e.target.value)}
                        isDisabled={!config.editable}
                        variant={isChanged ? 'bordered' : 'flat'}
                        color={isChanged ? 'warning' : 'default'}
                        placeholder={`请输入${config.description}`}
                    />
                )}

                {config.required && (
                    <div className="text-xs text-gray-500">* 此配置为必填项</div>
                )}
            </div>
        );
    };

    // 检查是否有变更
    const hasChanges = configs.some(config =>
        configValues[config.key] !== config.value && config.editable
    );

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
                    <Settings className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800">系统配置</h1>
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
                        {hasChanges ? '保存全部' : '无变更'}
                    </Button>
                </div>
            </div>

            {/* 配置说明 */}
            <Card>
                <CardBody>
                    <div className="text-sm text-gray-600">
                        <p>🔧 这里是系统的核心配置管理，请谨慎修改。</p>
                        <p>💡 标记为黄色边框的配置表示已修改但未保存。</p>
                        <p>🔒 灰色背景的配置表示不可编辑。</p>
                    </div>
                </CardBody>
            </Card>

            {/* 配置列表 */}
            <div className="space-y-4">
                <Accordion variant="splitted" defaultExpandedKeys={Object.keys(groupedConfigs)}>
                    {Object.entries(groupedConfigs).map(([group, groupConfigs]) => (
                        <AccordionItem
                            key={group}
                            aria-label={group}
                            title={
                                <div className="flex items-center gap-3">
                                    {getGroupIcon(group)}
                                    <span className="font-medium">{group}</span>
                                    <span className="text-sm text-gray-500">({groupConfigs.length}项)</span>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                {groupConfigs.map((config, index) => (
                                    <div key={config.key}>
                                        {renderConfigInput(config)}
                                        {index < groupConfigs.length - 1 && <Divider className="my-4" />}
                                    </div>
                                ))}
                            </div>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {/* 操作提示 */}
            {hasChanges && (
                <Card className="border-warning-200 bg-warning-50">
                    <CardBody>
                        <div className="flex items-center gap-2 text-warning-700">
                            <Bell className="w-4 h-4" />
                            <span className="text-sm">
                                您有未保存的配置更改，请及时保存以避免数据丢失。
                            </span>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default SettingsManagePage; 