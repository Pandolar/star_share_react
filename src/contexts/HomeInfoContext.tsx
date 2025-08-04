import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HomeInfo } from '../types/homeInfo';
import { announcementApi } from '../services/userApi';

// 默认的HomeInfo数据（作为fallback）
const defaultHomeInfo: HomeInfo = {
    siteInfo: {
        siteName: 'NiceAIGC',
        logoUrl: 'https://niceaigc-cos.niceaigc.com/casdoor/resource/built-in/admin/oai.svg',
        description: '致力于推动人工智能技术的发展与应用，为用户提供智能、高效、便捷的AI解决方案。',
        companyName: 'NiceAIGC',
        contactInfo: {
            email: 'contact@niceaigc.com'
        },
        copyrightYear: '2024',
        icpNumber: '沪ICP备2024091545号-1'
    },
    navigation: {
        navActions: [
            {
                name: '研究',
                type: 'text',
                url: '#research',
                target: '_self',
            },
            {
                name: '产品',
                type: 'text',
                url: '#products',
                target: '_self',
            },
            {
                name: '关于我们',
                type: 'text',
                url: '#about',
                target: '_self',
            },
            {
                name: '开放平台',
                type: 'outline',
                url: 'https://api.niceaigc.com/',
                target: '_blank',
            },
            {
                name: '开始对话',
                type: 'solid',
                url: 'https://share.niceaigc.com/',
                target: '_blank',
            },
        ]
    },
    hero: {
        autoPlayInterval: 6000,
        slides: [
            {
                id: 1,
                title: '国内直连镜像服务',
                subtitle: '畅通无阻',
                description: '国内任意网络，无需魔法畅通无阻，全球各大AI模型，为您服务',
                image: 'https://niceaigc-cos.niceaigc.com/casdoor/resource/built-in/admin/Snipaste_2025-07-08_22-57-31.png',
                gradient: 'from-purple-25 to-pink-25',
                ctaText: '立即体验',
                ctaUrl: 'https://share.niceaigc.com/',
                learnMoreText: '了解更多',
                learnMoreUrl: 'https://share.niceaigc.com/'
            },
            {
                id: 2,
                title: 'Plus会员直充服务',
                subtitle: '直充个人号',
                description: '无需海外卡，无需繁琐步骤，国内微信/支付宝，1分钟直充自己账号，安全可靠',
                image: 'https://niceaigc-cos.niceaigc.com/casdoor/resource/built-in/admin/kgWeN216754042602034_l.jpg',
                gradient: 'from-blue-25 to-cyan-25',
                ctaText: '立即充值',
                ctaUrl: 'https://goplus.niceaigc.com/',
                learnMoreText: '产品详情',
                learnMoreUrl: 'https://goplus.niceaigc.com/'
            },
            {
                id: 3,
                title: '全网聚合AI模型API服务',
                subtitle: 'API',
                description: '稳定AI模型API服务，支持多种模型，多种API，多种语言，多种场景',
                image: 'https://niceaigc-cos.niceaigc.com/casdoor/resource/built-in/admin/Snipaste_2025-07-08_23-02-23.png',
                gradient: 'from-green-25 to-emerald-25',
                ctaText: '立刻接入',
                ctaUrl: 'https://api.niceaigc.com/',
                learnMoreText: '',
                learnMoreUrl: 'https://api.niceaigc.com/'
            }
        ]
    },
    features: {
        title: '本站特点',
        subtitle: '以用户为中心，以技术为驱动，以服务为宗旨',
        models: [
            {
                id: 1,
                name: '用户体系',
                description: '中心化用户体系，一处登录，多站使用，支持用户登录、注册、找回密码、修改密码、退出登录等功能',
                features: ['中心化', '单点登录', '数据加密', '便捷操作'],
                icon: 'User',
                color: 'bg-purple-50 text-purple-600',
                hoverColor: 'hover:bg-purple-100',
                badge: 'User System',
                badgeColor: 'bg-purple-100 text-purple-700',
                link: 'https://share.niceaigc.com/'
            },
            {
                id: 2,
                name: '无需魔法',
                description: '国内任意网络畅联，直通最强AI服务，无需魔法/代理/梯子，即可使用',
                features: ['无需魔法', '国内直连', '无需代理', '便捷操作'],
                icon: 'Globe',
                color: 'bg-blue-50 text-blue-600',
                hoverColor: 'hover:bg-blue-100',
                badge: 'STABLE',
                badgeColor: 'bg-blue-100 text-blue-700',
                link: 'https://share.niceaigc.com/'
            },
            {
                id: 3,
                name: 'Plus 充值',
                description: '支持个人Plus充值，充在自己号上，支持多种支付方式，无需担心隐私问题',
                features: ['Plus 充值', '多种支付方式', '隐私至上', '便捷操作'],
                icon: 'CreditCard',
                color: 'bg-green-50 text-green-600',
                hoverColor: 'hover:bg-green-100',
                badge: 'BETA',
                badgeColor: 'bg-green-100 text-green-700',
                link: 'https://goplus.niceaigc.com/'
            },
            {
                id: 4,
                name: 'API 接口',
                description: '支持API接口，支持多种语言和框架，支持多种数据格式',
                features: ['API 接口', '多种语言', '多种框架', '多种数据格式'],
                icon: 'Zap',
                color: 'bg-orange-50 text-orange-600',
                hoverColor: 'hover:bg-orange-100',
                badge: 'COMING',
                badgeColor: 'bg-orange-100 text-orange-700',
                link: 'https://api.niceaigc.com/'
            },
            {
                id: 5,
                name: '可开发票',
                description: '支持开发票，企业/个人均可, 支持多种发票类型, 如有需要请联系客服',
                features: ['发票', '多种发票类型', '方便报销'],
                icon: 'FileText',
                color: 'bg-red-50 text-red-600',
                hoverColor: 'hover:bg-red-100',
                badge: 'COMING',
                badgeColor: 'bg-red-100 text-red-700',
                link: 'https://share.niceaigc.com/'
            },
            {
                id: 6,
                name: '优质售后',
                description: '支持多种售后方式，微信/邮箱/QQ/工单，如有疑问可随时联系，客服会第一时间响应',
                features: ['售后', '多种售后方式', '稳定可靠', '快速响应'],
                icon: 'MessageSquare',
                color: 'bg-purple-50 text-purple-600',
                hoverColor: 'hover:bg-purple-100',
                badge: 'COMING',
                badgeColor: 'bg-purple-100 text-purple-700',
                link: 'https://share.niceaigc.com/'
            },
        ]
    },
    footer: {
        footerLinks: {
            开发者: [
                { name: 'API文档', href: '#' },
                { name: 'SDK下载', href: '#' },
                { name: '开发指南', href: '#' },
                { name: '社区论坛', href: '#' }
            ],
            资源: [
                { name: '帮助中心', href: '#' },
                { name: '视频教程', href: '#' },
                { name: '技术博客', href: '#' },
                { name: '最佳实践', href: '#' }
            ],
            公司: [
                { name: '关于我们', href: '#' },
                { name: '加入我们', href: '#' },
                { name: '新闻动态', href: '#' },
                { name: '投资者关系', href: '#' }
            ]
        },
        socialLinks: [
            { icon: 'Github', href: 'https://github.com/niceaigc', label: 'GitHub' },
            { icon: 'Twitter', href: 'https://x.com/niceaigc', label: 'Twitter' },
            { icon: 'Youtube', href: 'https://www.youtube.com/@niceaigc', label: 'YouTube' }
        ]
    }
};

interface HomeInfoContextType {
    homeInfo: HomeInfo;
    loading: boolean;
    error: string | null;
    refreshHomeInfo: () => Promise<void>;
}

const HomeInfoContext = createContext<HomeInfoContextType | undefined>(undefined);

export const useHomeInfo = () => {
    const context = useContext(HomeInfoContext);
    if (context === undefined) {
        throw new Error('useHomeInfo must be used within a HomeInfoProvider');
    }
    return context;
};

interface HomeInfoProviderProps {
    children: ReactNode;
}

// 添加缓存机制
let cachedData: HomeInfo | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export const HomeInfoProvider: React.FC<HomeInfoProviderProps> = ({ children }) => {
    const [homeInfo, setHomeInfo] = useState<HomeInfo>(defaultHomeInfo);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHomeInfo = async () => {
        try {
            // 检查缓存
            const now = Date.now();
            if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
                setHomeInfo(cachedData);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const response = await announcementApi.getPublicAndHomeInfo();

            if (response.code === 20000) {
                const data = response.data.home_info || defaultHomeInfo;
                setHomeInfo(data);
                cachedData = data;
                cacheTimestamp = now;
            } else {
                throw new Error(response.msg || '获取首页信息失败');
            }
        } catch (err) {
            console.error('获取首页信息失败:', err);
            setError(err instanceof Error ? err.message : '网络错误');
            // 优先使用缓存数据，其次使用默认数据
            if (cachedData) {
                setHomeInfo(cachedData);
            } else {
                setHomeInfo(defaultHomeInfo);
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshHomeInfo = async () => {
        await fetchHomeInfo();
    };

    useEffect(() => {
        fetchHomeInfo();
    }, []);

    const value: HomeInfoContextType = {
        homeInfo,
        loading,
        error,
        refreshHomeInfo
    };

    return (
        <HomeInfoContext.Provider value={value}>
            {children}
        </HomeInfoContext.Provider>
    );
};