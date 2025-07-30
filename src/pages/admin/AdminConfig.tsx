import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Switch,
  Divider,
  Spinner,
  Tabs,
  Tab
} from '@heroui/react';
import {
  RefreshCw,
  Save,
  Settings,
  Database,
  Mail,
  Shield,
  Globe,
  CreditCard,
  Bell,
  Palette
} from 'lucide-react';
import { configApi } from '../../services/api';
import { motion } from 'framer-motion';
import { showMessage } from '../../utils/toast';

interface ConfigItem {
  id: number;
  key: string;
  value: string;
  type: string;
  description?: string;
  category?: string;
}

const AdminConfig: React.FC = () => {
  const [data, setData] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  // 配置分类
  const configCategories = [
    {
      key: 'basic',
      label: '基础设置',
      icon: <Settings className="w-4 h-4" />,
      description: '网站基础配置信息'
    },
    {
      key: 'database',
      label: '数据库配置',
      icon: <Database className="w-4 h-4" />,
      description: '数据库连接和存储配置'
    },
    {
      key: 'email',
      label: '邮件配置',
      icon: <Mail className="w-4 h-4" />,
      description: '邮件发送服务配置'
    },
    {
      key: 'security',
      label: '安全设置',
      icon: <Shield className="w-4 h-4" />,
      description: '系统安全相关配置'
    },
    {
      key: 'payment',
      label: '支付配置',
      icon: <CreditCard className="w-4 h-4" />,
      description: '支付接口和商户配置'
    },
    {
      key: 'notification',
      label: '通知配置',
      icon: <Bell className="w-4 h-4" />,
      description: '系统通知和消息配置'
    }
  ];

  // 配置项定义
  const configFields = {
    basic: [
      { key: 'site_name', label: '网站名称', type: 'text', description: '显示在浏览器标题栏的网站名称' },
      { key: 'site_url', label: '网站地址', type: 'text', description: '网站的完整URL地址' },
      { key: 'site_description', label: '网站描述', type: 'textarea', description: '网站的简要描述，用于SEO' },
      { key: 'admin_username', label: '管理员用户名', type: 'text', description: '管理员登录用户名' },
      { key: 'admin_password', label: '管理员密码', type: 'password', description: '管理员登录密码' },
    ],
    database: [
      { key: 'db_host', label: '数据库主机', type: 'text', description: '数据库服务器地址' },
      { key: 'db_port', label: '数据库端口', type: 'text', description: '数据库服务器端口' },
      { key: 'db_name', label: '数据库名称', type: 'text', description: '数据库名称' },
      { key: 'db_username', label: '数据库用户名', type: 'text', description: '数据库连接用户名' },
      { key: 'db_password', label: '数据库密码', type: 'password', description: '数据库连接密码' },
    ],
    email: [
      { key: 'smtp_host', label: 'SMTP服务器', type: 'text', description: 'SMTP邮件服务器地址' },
      { key: 'smtp_port', label: 'SMTP端口', type: 'text', description: 'SMTP服务器端口' },
      { key: 'smtp_username', label: 'SMTP用户名', type: 'text', description: '邮件发送账户用户名' },
      { key: 'smtp_password', label: 'SMTP密码', type: 'password', description: '邮件发送账户密码' },
      { key: 'smtp_from', label: '发件人邮箱', type: 'text', description: '邮件发送方地址' },
    ],
    security: [
      { key: 'jwt_secret', label: 'JWT密钥', type: 'password', description: 'JWT令牌加密密钥' },
      { key: 'session_timeout', label: '会话超时(分钟)', type: 'text', description: '用户会话超时时间' },
      { key: 'max_login_attempts', label: '最大登录尝试次数', type: 'text', description: '账户锁定前的最大失败登录次数' },
      { key: 'enable_captcha', label: '启用验证码', type: 'switch', description: '是否在登录时启用验证码' },
    ],
    payment: [
      { key: 'payment_gateway', label: '支付网关', type: 'text', description: '使用的支付网关服务' },
      { key: 'merchant_id', label: '商户号', type: 'text', description: '支付服务商提供的商户标识' },
      { key: 'api_key', label: 'API密钥', type: 'password', description: '支付接口API密钥' },
      { key: 'webhook_url', label: '回调地址', type: 'text', description: '支付结果回调通知地址' },
    ],
    notification: [
      { key: 'enable_email_notification', label: '启用邮件通知', type: 'switch', description: '是否发送邮件通知' },
      { key: 'enable_sms_notification', label: '启用短信通知', type: 'switch', description: '是否发送短信通知' },
      { key: 'notification_sender', label: '通知发送者', type: 'text', description: '系统通知的发送者名称' },
    ]
  };

  // 加载配置数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await configApi.list();
      const configs = Array.isArray(result.data) ? result.data : [];
      setData(configs);

      // 转换为表单数据格式
      const formObj: { [key: string]: string } = {};
      configs.forEach(config => {
        formObj[config.key] = config.value;
      });
      setFormData(formObj);
    } catch (error: any) {
      showMessage.error(error.message || '加载配置失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存配置
  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await configApi.update({ key, value });
      showMessage.success('配置保存成功');

      // 更新本地数据
      setFormData(prev => ({ ...prev, [key]: value }));

      // 更新数据列表
      setData(prev => prev.map(item =>
        item.key === key ? { ...item, value } : item
      ));
    } catch (error: any) {
      showMessage.error(error.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 批量保存分类配置
  const handleSaveCategory = async (category: string) => {
    setSaving(true);
    try {
      const categoryFields = configFields[category as keyof typeof configFields] || [];

      for (const field of categoryFields) {
        if (formData[field.key] !== undefined) {
          await configApi.update({ key: field.key, value: formData[field.key] });
        }
      }

      showMessage.success(`${configCategories.find(c => c.key === category)?.label}配置保存成功`);
      loadData(); // 重新加载数据
    } catch (error: any) {
      showMessage.error(error.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 渲染配置字段
  const renderField = (field: any, category: string) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            label={field.label}
            placeholder={`请输入${field.label}`}
            description={field.description}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            variant="bordered"
            maxRows={4}
          />
        );
      case 'switch':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{field.label}</span>
                {field.description && (
                  <span className="text-xs text-gray-500">{field.description}</span>
                )}
              </div>
              <Switch
                isSelected={value === 'true' || value === '1'}
                onValueChange={(checked) => {
                  const newValue = checked ? '1' : '0';
                  setFormData(prev => ({ ...prev, [field.key]: newValue }));
                  handleSave(field.key, newValue);
                }}
              />
            </div>
          </div>
        );
      case 'password':
        return (
          <Input
            type="password"
            label={field.label}
            placeholder={`请输入${field.label}`}
            description={field.description}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            variant="bordered"
            endContent={
              <Button
                size="sm"
                variant="light"
                onPress={() => handleSave(field.key, formData[field.key] || '')}
                isLoading={saving}
              >
                保存
              </Button>
            }
          />
        );
      default:
        return (
          <Input
            label={field.label}
            placeholder={`请输入${field.label}`}
            description={field.description}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            variant="bordered"
            endContent={
              <Button
                size="sm"
                variant="light"
                onPress={() => handleSave(field.key, formData[field.key] || '')}
                isLoading={saving}
              >
                保存
              </Button>
            }
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            系统配置
          </h1>
          <p className="text-gray-600 mt-1">管理系统的各项配置参数</p>
        </div>
        <Button
          variant="flat"
          startContent={<RefreshCw className="w-4 h-4" />}
          onPress={loadData}
          isLoading={loading}
        >
          刷新配置
        </Button>
      </div>

      {/* 配置选项卡 */}
      <Card className="border-0 shadow-lg">
        <Tabs
          aria-label="配置分类"
          className="w-full"
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-6 border-b border-divider",
            cursor: "w-full bg-blue-600",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-blue-600"
          }}
        >
          {configCategories.map((category) => (
            <Tab
              key={category.key}
              title={
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span>{category.label}</span>
                </div>
              }
            >
              <div className="p-6 space-y-6">
                <div className="text-sm text-gray-600 mb-4">
                  {category.description}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(configFields[category.key as keyof typeof configFields] || []).map((field) => (
                    <div key={field.key}>
                      {renderField(field, category.key)}
                    </div>
                  ))}
                </div>

                {category.key !== 'security' && category.key !== 'notification' && (
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button
                      color="primary"
                      variant="shadow"
                      startContent={<Save className="w-4 h-4" />}
                      onPress={() => handleSaveCategory(category.key)}
                      isLoading={saving}
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      保存{category.label}
                    </Button>
                  </div>
                )}
              </div>
            </Tab>
          ))}
        </Tabs>
      </Card>

      {/* 系统状态概览 */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">系统状态</h3>
              <p className="text-sm text-gray-500">当前系统运行状态概览</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">数据库连接</span>
              </div>
              <p className="text-xs text-green-600">正常运行</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">API服务</span>
              </div>
              <p className="text-xs text-blue-600">响应正常</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium text-purple-800">缓存服务</span>
              </div>
              <p className="text-xs text-purple-600">运行良好</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default AdminConfig;