import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HomeInfo } from '../types/homeInfo';
import { announcementApi } from '../services/userApi';
import { defaultHomeInfo } from './homeInfoDefaults';

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