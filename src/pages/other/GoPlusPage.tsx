/**
* ChatGPT Plus自助充值页面
* 提供简单现代化的ChatGPT Plus充值服务
*/
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Accordion, AccordionItem } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Shield,
    Clock,
    Star,
    CreditCard,
    CheckCircle,
    AlertCircle,
    Copy,
    ExternalLink,
    Play,
    HelpCircle,
    Menu,
    MessageCircle,
    Mail,
    Clock8,
    Tag,
    Box,
    SmartphoneNfc
} from 'lucide-react';
import QRCodeGenerator from 'qrcode-generator';
import { showMessage } from '../../utils/toast';

// 导航链接接口
interface NavLink {
    label: string;
    href: string;
    external?: boolean;
}

// 页面配置接口
interface PageConfig {
    brandName: string;
    brandLogo: string;
    partnerName: string;
    partnerLogo: string;
    navLinks: NavLink[];
    videoTutorialUrl: string;
    supportContact: string;
}

// 默认配置
const defaultConfig: PageConfig = {
    brandName: 'NiceAIGC',
    brandLogo: '/img/logo.png',
    partnerName: 'ChatGPT',
    partnerLogo: '/img/oai.svg',
    navLinks: [
        { label: '首页', href: '/', external: true },
        // { label: '关于我们', href: '/about', external: false }
    ],
    videoTutorialUrl: 'https://example.com/tutorial',
    supportContact: 'https://example.com/support'
};

// 充值步骤类型
type RechargeStepType = 'json_input' | 'json_verify' | 'payment' | 'processing' | 'success';

// 充值步骤常量
const RechargeStep = {
    JSON_INPUT: 'json_input' as const,
    JSON_VERIFY: 'json_verify' as const,
    PAYMENT: 'payment' as const,
    PROCESSING: 'processing' as const,
    SUCCESS: 'success' as const
};

// 订单信息接口
interface OrderInfo {
    trade_no: string;
    order_id: string;
    payment_url: string | null;
    qr_code: string;
    channel: string;
    pay_type: string;
    price: number;
    package_name: string;
}

// 订单状态接口
interface OrderStatus {
    status: string;
    order_id: string;
    message: string;
}

// JSON验证状态接口
interface JsonValidationState {
    isJsonValid: boolean;      // JSON格式是否有效
    hasAllFields: boolean;     // 是否包含所有必要字段
    errorMessage?: string;     // 错误信息
}

const GoPlusPage: React.FC = () => {
    // 配置状态
    const [config] = useState<PageConfig>(defaultConfig);

    // 充值相关状态
    const [currentStep, setCurrentStep] = useState<RechargeStepType>(RechargeStep.JSON_INPUT);
    const [jsonInput, setJsonInput] = useState('');
    const [validatedData, setValidatedData] = useState<any>(null);
    const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentTimer, setPaymentTimer] = useState<NodeJS.Timeout | null>(null);
    
    // 二维码过期相关状态
    const [qrCodeExpiryTime, setQrCodeExpiryTime] = useState<number | null>(null);
    const [remainingTime, setRemainingTime] = useState<number>(300); // 5分钟，单位：秒
    const [isQrCodeExpired, setIsQrCodeExpired] = useState<boolean>(false);
    
    // JSON验证状态 - 明确区分格式验证和字段验证
    const [validationState, setValidationState] = useState<JsonValidationState>({
        isJsonValid: false,
        hasAllFields: false
    });

    // Modal控制
    const { isOpen: isPaymentModalOpen, onOpen: openPaymentModal, onOpenChange: onPaymentModalChange } = useDisclosure();

    // 特点数据
    const features = [
        {
            icon: <CreditCard className="w-8 h-8 text-primary" />,
            title: '无需虚拟卡',
            description: '支持国内微信、支付宝直接支付'
        },
        {
            icon: <Star className="w-8 h-8 text-warning" />,
            title: '好评率99.9%',
            description: '数万用户验证，口碑保证'
        },
        {
            icon: <Clock className="w-8 h-8 text-success" />,
            title: '1分钟到账',
            description: '支付完成后快速处理，极速到账'
        },
        {
            icon: <Shield className="w-8 h-8 text-secondary" />,
            title: '数据安全加密',
            description: '采用高级加密，保护您的隐私'
        }
    ];

    // FAQ数据
    const faqData = [
        {
            question: '如何获取上面说的JSON数据？',
            answer: (
                <>
                    1. 确保已登录ChatGPT官网<br />
                    2. 打开链接 <a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>https://chatgpt.com/api/auth/session</a><br />
                    3. 复制页面显示的所有JSON内容到本页面
                </>
            )
        },
        {
            question: '支付安全吗？我的账号会不会泄露？',
            answer: '安全，我们使用高级加密技术，不会存储您的敏感信息，所有交易都通过正规支付渠道完成。如果还是不放心，您可以在充值完后直接修改密码'
        },
        {
            question: '充值失败怎么办？',
            answer: '如果充值失败，请检查JSON数据是否正确，或联系客服获得帮助。我们提供24小时售后服务。'
        },
        {
            question: '多久能到账？',
            answer: '通常在支付完成后1分钟内到账，直接去官网刷新即可看到，如超过5分钟未到账，请联系客服处理。'
        },
        {
            question: '这是什么充值方式？渠道安全吗？',
            answer: '这是ChatGPT官方的充值方式，我们只是提供一个充值渠道。\n原理是使用阿根廷、尼日利亚、土耳其等国家的正规支付渠道，利用汇率差来进行充值。\n100%正规！且和其他方式没有区别，您可以放心使用。'
        },
        {
            question: '会封号吗？会降智吗',
            answer: '我们只是提供一个充值渠道，不会对您的账号进行任何操作。\n我们建议您使用固定的欧美的ip进行使用，且尽量不要和他人共享账号。'
        },
        {
            question: '没到期可以续费吗？',
            answer: '可以不到期续费，但是不能叠加，比如您原有的plus到8月15日过期，今天是7月25，您再使用自助激活的话，只能将会员续费到8月25日而不是叠加，所以建议过期后或过期前一天再进行续费。'
        }
    ];

    // 清理定时器
    useEffect(() => {
        return () => {
            if (paymentTimer) {
                clearTimeout(paymentTimer);
            }
        };
    }, [paymentTimer]);

    // 实时验证JSON - 先验证格式，再验证字段
    useEffect(() => {
        // 延迟验证，避免输入过程中频繁验证
        const delayDebounceFn = setTimeout(() => {
            validateJsonInput(jsonInput);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [jsonInput]);

    // 二维码过期计时器
    useEffect(() => {
        let timer: NodeJS.Timeout;
        
        if (qrCodeExpiryTime && !isQrCodeExpired) {
            timer = setInterval(() => {
                const now = Date.now();
                const remaining = Math.ceil((qrCodeExpiryTime - now) / 1000);
                
                if (remaining <= 0) {
                    // 二维码已过期
                    setIsQrCodeExpired(true);
                    setRemainingTime(0);
                    
                    // 停止订单检查
                    if (paymentTimer) {
                        clearTimeout(paymentTimer);
                        setPaymentTimer(null);
                    }
                    
                    clearInterval(timer);
                } else {
                    setRemainingTime(remaining);
                }
            }, 1000);
        }
        
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [qrCodeExpiryTime, isQrCodeExpired, paymentTimer]);

    // 生成二维码
    const generateQRCode = (text: string): string => {
        const qr = QRCodeGenerator(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createDataURL(8, 4);
    };

    // 验证JSON输入（先验证格式，再验证字段）
    const validateJsonInput = (input: string) => {
        // 清空输入时重置状态
        if (!input.trim()) {
            setValidationState({
                isJsonValid: false,
                hasAllFields: false,
                errorMessage: '请输入JSON数据'
            });
            setValidatedData(null);
            return;
        }

        // 第一步：验证JSON格式
        try {
            const parsed = JSON.parse(input);
            setValidatedData(parsed);
            
            // JSON格式有效
            setValidationState(prev => ({ ...prev, isJsonValid: true }));
            
            // 第二步：验证必要字段
            const requiredFields = ['user.id', 'user.email', 'account.id', 'accessToken'];
            const missingFields: string[] = [];

            requiredFields.forEach(field => {
                const keys = field.split('.');
                let current = parsed;
                for (let key of keys) {
                    if (!current || !current.hasOwnProperty(key)) {
                        missingFields.push(field);
                        break;
                    }
                    current = current[key];
                }
            });

            if (missingFields.length > 0) {
                setValidationState({
                    isJsonValid: true,
                    hasAllFields: false,
                    errorMessage: `缺少必要字段: ${missingFields.join(', ')}`
                });
            } else {
                setValidationState({
                    isJsonValid: true,
                    hasAllFields: true,
                    errorMessage: 'JSON格式正确且包含所有必要字段'
                });
            }
        } catch (e) {
            // JSON格式无效
            setValidationState({
                isJsonValid: false,
                hasAllFields: false,
                errorMessage: `JSON格式错误，请确认复制正确且完整: ${(e as Error).message}`
            });
            setValidatedData(null);
        }
    };

    // 验证并进入下一步
    const validateAndProceed = () => {
        // 先检查JSON格式是否有效
        if (!validationState.isJsonValid) {
            showMessage.error(validationState.errorMessage || 'JSON格式不正确，请检查');
            return;
        }
        
        // 再检查字段是否完整
        if (!validationState.hasAllFields) {
            showMessage.error(validationState.errorMessage || 'JSON格式不正确，请检查并复制完整数据到输入框');
            return;
        }
        
        // 验证通过，进入下一步
        setCurrentStep(RechargeStep.JSON_VERIFY);
        showMessage.success('JSON验证通过，包含所有必要字段');
    };

    // 创建订单
    const createOrder = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/u/go_plus_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });

            const result = await response.json();

            if (result.code === 20000 && result.data.success) {
                setOrderInfo(result.data);
                setCurrentStep(RechargeStep.PAYMENT);
                openPaymentModal();
                
                // 设置二维码过期时间为5分钟后
                const expiryTime = Date.now() + 5 * 60 * 1000; // 5分钟
                setQrCodeExpiryTime(expiryTime);
                setIsQrCodeExpired(false);
                setRemainingTime(300); // 5分钟 = 300秒
                
                startPaymentCheck(result.data.order_id);
            } else {
                showMessage.error('创建订单失败，请重试');
            }
        } catch (error) {
            showMessage.error('创建订单失败: 网络错误，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    // 开始支付状态检查
    const startPaymentCheck = (orderId: string) => {
        const checkPayment = async () => {
            // 如果二维码已过期，停止检查
            if (isQrCodeExpired) return;
            
            try {
                const response = await fetch(`/u/go_plus_order?order_id=${orderId}`);
                const result = await response.json();

                if (result.code === 20000) {
                    const status: OrderStatus = result.data;

                    if (status.status === 'success') {
                        // 支付成功，进行实际充值
                        setCurrentStep(RechargeStep.PROCESSING);
                        onPaymentModalChange();
                        performRecharge(orderId);
                        return;
                    }

                    if (status.status === 'failed') {
                        // 继续检查
                        const timer = setTimeout(checkPayment, 2000);
                        setPaymentTimer(timer);
                    }
                }
            } catch (error) {
                showMessage.error('检查支付状态失败: 网络错误');
                // 继续检查
                const timer = setTimeout(checkPayment, 2000);
                setPaymentTimer(timer);
            }
        };

        // 开始第一次检查
        const timer = setTimeout(checkPayment, 2000);
        setPaymentTimer(timer);
    };

    // 执行充值
    const performRecharge = async (orderId: string) => {
        try {
            const response = await fetch('/u/go_plus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: orderId,
                    user_data: validatedData
                })
            });

            const result = await response.json();

            if (result.code === 20000 && result.msg === 'ok') {
                setCurrentStep(RechargeStep.SUCCESS);
                showMessage.success('充值成功！请返回ChatGPT官网查看');
            } else {
                showMessage.error('充值失败，请联系客服');
            }
        } catch (error) {
            showMessage.error('执行充值失败: 网络错误，请联系客服');
        }
    };

    // 重置流程
    const resetProcess = () => {
        setCurrentStep(RechargeStep.JSON_INPUT);
        setJsonInput('');
        setValidatedData(null);
        setOrderInfo(null);
        setQrCodeExpiryTime(null);
        setIsQrCodeExpired(false);
        setRemainingTime(300);
        
        if (paymentTimer) {
            clearTimeout(paymentTimer);
            setPaymentTimer(null);
        }
    };

    // 格式化剩余时间为分:秒格式
    const formatRemainingTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 复制示例JSON
    const copyExampleJson = () => {
        const exampleJson = JSON.stringify({
            "user": {
                "id": "user-xxx",
                "email": "xxx@xx.com",
                "idp": "auth0",
                "iat": 1753971734,
                "mfa": false
            },
            "expires": "2025-10-29T14:22:21.845Z",
            "account": {
                "id": "xxx",
                "planType": "free",
                "structure": "personal",
                "workspaceType": null,
                "organizationId": null,
                "isDelinquent": false,
                "gracePeriodId": null
            },
            "accessToken": "eyJhbxxxx",
            "authProvider": "openai",
            "rumViewTags": {
                "light_account": {
                    "fetched": false
                }
            }
        }, null, 2);

        navigator.clipboard.writeText(exampleJson);
        showMessage.success('示例JSON已复制到剪贴板');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 导航栏 */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo区域 */}
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <img
                                    src={config.brandLogo}
                                    alt={config.brandName}
                                    className="h-8 w-8 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo.svg';
                                    }}
                                />
                                <span className="font-semibold text-lg text-gray-900">{config.brandName}</span>
                            </div>
                            <div className="hidden sm:flex items-center space-x-2 text-gray-500">
                                <span>×</span>
                                <img
                                    src={config.partnerLogo}
                                    alt={config.partnerName}
                                    className="h-8 w-8 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo.svg';
                                    }}
                                />
                                <span className="text-sm">{config.partnerName}</span>
                            </div>
                        </div>

                        {/* 导航链接 */}
                        <div className="hidden md:flex items-center space-x-6">
                            {config.navLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    target={link.external ? '_blank' : '_self'}
                                    rel={link.external ? 'noopener noreferrer' : undefined}
                                    className="text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-base font-bold px-6 py-2 rounded-lg shadow-lg flex items-center"
                                    style={{ fontSize: '1.1rem', minHeight: '44px' }}
                                >
                                    {link.label}
                                    {link.external && <ExternalLink className="w-4 h-4 ml-2 inline" />}
                                </a>
                            ))}
                        </div>

                        {/* 移动端菜单按钮 */}
                        <div className="md:hidden">
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                aria-label="菜单"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 标题区域 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        ChatGPT Plus 自助充值
                    </h1>
                    <p className="text-xl text-gray-600">
                        安全快速，专业可靠的ChatGPT Plus充值服务
                    </p>
                </motion.div>

                {/* 特点栏 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-12"
                >
                    <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">为什么选择我们</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                                    <CardBody className="text-center p-6">
                                        <div className="flex justify-center mb-4">
                                            {feature.icon}
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                                        <p className="text-gray-600 text-sm">{feature.description}</p>
                                    </CardBody>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* 教程栏 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-12"
                >
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-primary">
                        <CardBody className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <Zap className="w-8 h-8 text-primary" />
                                <h2 className="text-2xl font-semibold text-gray-900">极简步骤，一分钟搞定！</h2>
                            </div>
                            <div className="text-lg text-gray-700 space-y-2">
                                <p><span className="font-semibold text-primary">第一步.</span> 登录ChatGPT官网后，复制JSON到本页面</p>
                                <p><span className="font-semibold text-primary">第二步.</span> 支付完成并充值到账</p>
                            </div>
                        </CardBody>
                    </Card>
                </motion.div>

                {/* 充值栏 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mb-12"
                >
                    <Card className="shadow-lg">
                        <CardBody className="p-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6">开始充值</h2>

                            <AnimatePresence mode="wait">
                                {currentStep === RechargeStep.JSON_INPUT && (
                                    <motion.div
                                        key="json_input"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-start space-x-3">
                                                <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                                                <div className="text-base text-yellow-800">
                                                    <p className="font-semibold mb-2">请先确保已登录ChatGPT官网</p>
                                                    <p>
                                                        如果已经登录，请点击
                                                        <a
                                                            href="https://chatgpt.com/api/auth/session"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mx-1 text-blue-600 hover:text-blue-800 underline inline-flex items-center text-base"
                                                        >
                                                            这里 <ExternalLink className="w-4 h-4 ml-1" />
                                                        </a>
                                                        复制完整的JSON数据
                                                    </p>
                                                    <p className="mt-2">
                                                        如果没有登录，请先访问
                                                        <a
                                                            href="https://chatgpt.com/auth/login"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mx-1 text-blue-600 hover:text-blue-800 underline inline-flex items-center text-base"
                                                        >
                                                            ChatGPT官网 <ExternalLink className="w-4 h-4 ml-1" />
                                                        </a>
                                                        登录后再回到此页面
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* JSON输入框 */}
                                            <Textarea
                                                label="JSON"
                                                placeholder="请粘贴从上述所复制的完整JSON数据，即使收缩到一行也可以"
                                                value={jsonInput}
                                                onChange={(e) => setJsonInput(e.target.value)}
                                                minRows={8}
                                                className={`w-full transition-all duration-300 ${
                                                    jsonInput 
                                                        ? validationState.isJsonValid
                                                            ? validationState.hasAllFields
                                                                ? 'border-green-500 focus:ring-green-200'  // 完全有效
                                                                : 'border-yellow-500 focus:ring-yellow-200' // 格式有效但字段不全
                                                            : 'border-red-500 focus:ring-red-200'  // 格式无效
                                                        : ''  // 未输入
                                                }`}
                                            />
                                            
                                            {/* 实时验证提示 */}
                                            {jsonInput && (
                                                <div className={`text-sm flex items-center ${
                                                    validationState.isJsonValid
                                                        ? validationState.hasAllFields
                                                            ? 'text-green-600'  // 完全有效
                                                            : 'text-yellow-600' // 格式有效但字段不全
                                                        : 'text-red-600'  // 格式无效
                                                }`}>
                                                    {validationState.isJsonValid
                                                        ? validationState.hasAllFields
                                                            ? <CheckCircle className="w-4 h-4 mr-1" />
                                                            : <AlertCircle className="w-4 h-4 mr-1" />
                                                        : <AlertCircle className="w-4 h-4 mr-1" />
                                                    }
                                                    {validationState.errorMessage}
                                                </div>
                                            )}
                                            
                                            {/* 按钮区域 - 确保始终显示 */}
                                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                                <Button
                                                    color="primary"
                                                    onPress={validateAndProceed}
                                                    className="flex-1 !bg-blue-600 !text-white hover:!bg-blue-700"
                                                    // 按钮始终启用，但点击时会根据验证状态给出提示
                                                    isDisabled={false}
                                                >
                                                    下一步
                                                </Button>
                                                {/* <Button
                                                    variant="bordered"
                                                    onPress={copyExampleJson}
                                                >
                                                    复制示例JSON
                                                </Button> */}
                                            </div>
                                        </div>

                                        {/* 示例JSON手风琴 */}

                                            <CardBody className="p-6">
                                                <Accordion variant="splitted">
                                                    <AccordionItem
                                                        key="example-json"
                                                        aria-label="示例JSON格式"
                                                        startContent={<Copy className="w-5 h-5 text-primary" />}
                                                        title="查看示例JSON格式"
                                                        subtitle="点击展开查看完整的JSON示例"
                                                    >
                                                        <div className="space-y-3">
                                                            <p className="text-gray-600">
                                                                以下是ChatGPT Session JSON的标准格式示例（即使收缩到一行也可以）：
                                                            </p>
                                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                                <pre className="text-xs text-gray-800 overflow-x-auto">
                                                                    <code>
                                                                        {`{
  "user": {
    "id": "user-xxx",
    "email": "xxx@xx.com",
    "idp": "auth0",
    "iat": 1753971734,
    "mfa": false
  },
  "expires": "2025-10-29T14:22:21.845Z",
  "account": {
    "id": "xxx",
    "planType": "free",
    "structure": "personal",
    "workspaceType": null,
    "organizationId": null,
    "isDelinquent": false,
    "gracePeriodId": null
  },
  "accessToken": "eyJhbxxxx",
  "authProvider": "openai",
  "rumViewTags": {
    "light_account": {
      "fetched": false
    }
  }
}`}
                                                                    </code>
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </AccordionItem>
                                                </Accordion>
                                            </CardBody>

                                    </motion.div>
                                )}

                                {currentStep === RechargeStep.JSON_VERIFY && (
                                    <motion.div
                                        key="json_verify"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <span className="text-green-800 font-medium">确认邮箱无误后请点击下一步！</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            {/* <div>
                                                <label className="font-medium text-gray-700">用户ID:</label>
                                                <p className="text-gray-900 mt-1">{validatedData?.user?.id}</p>
                                            </div> */}
                                            <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm col-span-1 md:col-span-2 w-full">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                                                    <Mail className="w-5 h-5 text-blue-500" />
                                                </span>
                                                <div>
                                                    <label className="block text-gray-600 font-semibold">邮箱</label>
                                                    <span className="text-gray-900 text-base font-medium">{validatedData?.user?.email}</span>
                                                </div>
                                            </div>
                                            {/* <div>
                                                <label className="font-medium text-gray-700">账户类型:</label>
                                                <p className="text-gray-900 mt-1">{validatedData?.account?.planType}</p>
                                            </div>
                                            <div>
                                                <label className="font-medium text-gray-700">账户ID:</label>
                                                <p className="text-gray-900 mt-1">{validatedData?.account?.id}</p>
                                            </div> */}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <Button
                                                color="primary"
                                                onPress={createOrder}
                                                isLoading={isLoading}
                                                className="flex-1 !bg-blue-600 !text-white hover:!bg-blue-700"
                                            >
                                                {isLoading ? '创建订单中...' : '创建订单并支付'}
                                            </Button>
                                            <Button
                                                variant="bordered"
                                                onPress={() => setCurrentStep(RechargeStep.JSON_INPUT)}
                                            >
                                                重新输入
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === RechargeStep.PROCESSING && (
                                    <motion.div
                                        key="processing"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-6"
                                    >
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">正在处理充值</h3>
                                            <p className="text-gray-600">请稍候，我们正在为您的账户充值...</p>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === RechargeStep.SUCCESS && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="text-center space-y-6"
                                    >
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">充值成功！</h3>
                                            <p className="text-gray-600 mb-4">
                                                您的ChatGPT Plus已成功充值，请返回ChatGPT官网查看
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                <Button
                                                    color="primary"
                                                    as="a"
                                                    href="https://chatgpt.com/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    startContent={<ExternalLink className="w-4 h-4" />}
                                                >
                                                    返回ChatGPT官网
                                                </Button>
                                                <Button
                                                    variant="bordered"
                                                    onPress={resetProcess}
                                                >
                                                    再次充值
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardBody>
                    </Card>
                </motion.div>

                {/* 帮助中心 - 手风琴样式 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mb-8"
                >
                    <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">帮助中心</h2>
                    <div className="space-y-4">
                        {/* 视频教程 */}
                        {/* <Card>
                            <CardBody className="p-6">
                                <Accordion variant="splitted">
                                    <AccordionItem
                                        key="video-tutorial"
                                        aria-label="视频教程"
                                        startContent={<Play className="w-5 h-5 text-primary" />}
                                        title="视频教程"
                                        subtitle="观看详细的操作视频，了解完整的充值流程"
                                    >
                                        <div className="space-y-4">
                                            <p className="text-gray-600">
                                                我们为您准备了详细的视频教程，包含完整的ChatGPT Plus充值流程演示。
                                            </p>
                                            <Button
                                                color="primary"
                                                variant="flat"
                                                as="a"
                                                href={config.videoTutorialUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                startContent={<Play className="w-4 h-4" />}
                                                className="w-full sm:w-auto"
                                            >
                                                观看视频教程
                                            </Button>
                                        </div>
                                    </AccordionItem>
                                </Accordion>
                            </CardBody>
                        </Card> */}

                        {/* 常见问题 */}
                        <Card>
                            <CardBody className="p-6">
                                <Accordion variant="splitted">
                                    {faqData.map((faq, index) => (
                                        <AccordionItem
                                            key={`faq-${index}`}
                                            aria-label={faq.question}
                                            startContent={<HelpCircle className="w-5 h-5 text-primary" />}
                                            title={faq.question}
                                        >
                                            <div className="text-gray-600 whitespace-pre-line">
                                                {faq.answer}
                                            </div>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardBody>
                        </Card>

                        {/* 联系客服 */}
                        <Card>
                            <CardBody className="p-6">
                                <Accordion variant="splitted">
                                    <AccordionItem
                                        key="contact-support"
                                        aria-label="联系客服"
                                        startContent={<MessageCircle className="w-5 h-5 text-primary" />}
                                        title="联系客服"
                                        subtitle="如有其他问题，请联系我们的客服团队"
                                    >
                                        <div className="space-y-4">
                                            <p className="text-gray-600">
                                                我们提供24小时在线客服支持，如果您在使用过程中遇到任何问题，请随时联系我们。
                                            </p>
                                            <Button
                                                color="primary"
                                                variant="flat"
                                                as="a"
                                                href={config.supportContact}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                startContent={<MessageCircle className="w-4 h-4" />}
                                                className="w-full sm:w-auto"
                                            >
                                                联系客服
                                            </Button>
                                        </div>
                                    </AccordionItem>
                                </Accordion>
                            </CardBody>
                        </Card>
                    </div>
                </motion.div>
            </div>

            {/* 支付Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onOpenChange={onPaymentModalChange}
                size="lg"
                hideCloseButton
                isDismissable={false}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                扫码支付
                            </ModalHeader>
                            <ModalBody className="text-center">
                                {orderInfo && (
                                    <div className="space-y-6">
                                        {/* 二维码区域 - 带过期覆盖层 */}
                                        <div className="relative bg-gray-50 p-6 rounded-lg inline-block mx-auto">
                                            <img
                                                src={generateQRCode(orderInfo.qr_code)}
                                                alt="支付二维码"
                                                className={`w-48 h-48 mx-auto transition-opacity duration-300 ${
                                                    isQrCodeExpired ? 'opacity-50' : 'opacity-100'
                                                }`}
                                            />
                                            
                                            {/* 过期覆盖层 */}
                                            {isQrCodeExpired && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 rounded-lg">
                                                    <div className="text-center p-4">
                                                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                                        <h3 className="text-lg font-semibold text-red-700 mb-1">二维码已过期</h3>
                                                        <p className="text-sm text-gray-600">请刷新页面重新获取</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* 倒计时提示 */}
                                            {!isQrCodeExpired && (
                                                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs px-4 py-1.5 rounded-full flex items-center shadow-lg border border-yellow-300 font-semibold transition-all duration-300">
                                                    <Clock8 className="w-4 h-4 mr-2 text-yellow-700" />
                                                    <span>
                                                        剩余时间：<span className="font-bold">{formatRemainingTime(remainingTime)}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 现代化订单信息卡片 */}
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="p-5 space-y-4">
                                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                    <div className="flex items-center text-gray-700">
                                                        <Tag className="w-4 h-4 mr-2 text-primary" />
                                                        <span>订单信息</span>
                                                    </div>
                                                    <span
                                                        className={`text-base font-semibold px-4 py-2 rounded-full
                                                            ${orderInfo.pay_type === 'wxpay'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                            }`
                                                        }
                                                    >
                                                        {orderInfo.pay_type === 'wxpay' ? '微信支付' : '支付宝'}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-xs text-gray-500 mb-1">订单号</span>
                                                        <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                                            {orderInfo.order_id}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-xs text-gray-500 mb-1">套餐名称</span>
                                                        <span className="text-sm font-medium text-gray-900">{orderInfo.package_name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-start col-span-2 pt-2">
                                                        <span className="text-xs text-gray-500 mb-1">订单金额</span>
                                                        <span className="text-xl font-bold text-gray-900">{orderInfo.price}元</span>
                                                    </div>
                                                </div>
                                                
                                                <div className={`p-3 rounded-lg text-sm ${
                                                    isQrCodeExpired 
                                                        ? 'bg-red-50 text-red-600' 
                                                        : 'bg-blue-50 text-blue-800'
                                                }`}>
                                                    {isQrCodeExpired 
                                                        ? '二维码已过期，请刷新页面重新创建订单' 
                                                        : `请使用${orderInfo.pay_type === 'wxpay' ? '微信' : '支付宝'}扫码支付，支付完成后会自动跳转`
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    color="danger"
                                    variant="bordered"
                                    onPress={() => {
                                        if (paymentTimer) {
                                            clearTimeout(paymentTimer);
                                        }
                                        resetProcess();
                                        onClose();
                                    }}
                                >
                                    取消支付
                                </Button>
                                
                                {/* 二维码过期时显示刷新按钮 */}
                                {isQrCodeExpired && (
                                    <Button
                                        color="primary"
                                        onPress={() => {
                                            if (paymentTimer) {
                                                clearTimeout(paymentTimer);
                                            }
                                            resetProcess();
                                            onClose();
                                            // 可以在这里添加刷新当前页面的逻辑
                                            window.location.reload();
                                        }}
                                    >
                                        刷新页面
                                    </Button>
                                )}
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default GoPlusPage;
