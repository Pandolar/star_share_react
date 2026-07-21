import React from 'react';
import { Chip, Tooltip } from '@heroui/react';
import { CircleUserRound, Package } from 'lucide-react';
import dayjs from 'dayjs';
import { AdminPackageSummary, AdminUserSummary } from '../../types/admin';

interface UserSummaryProps {
    user?: AdminUserSummary | null;
    userId: number;
    className?: string;
}

interface PackageSummaryProps {
    packageInfo?: AdminPackageSummary | null;
    packageId: number;
    className?: string;
}

interface LongTextPreviewProps {
    value?: string | null;
    className?: string;
}

const money = (value?: number | null) => `¥${Number(value || 0).toFixed(2)}`;

export const LongTextPreview: React.FC<LongTextPreviewProps> = ({ value, className = '' }) => {
    const text = String(value || '').trim();
    if (!text) return <span className="text-default-400">-</span>;

    return (
        <Tooltip
            content={<div className="max-h-64 w-96 overflow-y-auto whitespace-pre-wrap break-words p-1 text-sm">{text}</div>}
            placement="top-start"
            delay={250}
            closeDelay={50}
        >
            <p className={`line-clamp-2 min-w-0 cursor-help whitespace-pre-wrap break-all text-sm text-default-600 ${className}`} title={text}>
                {text}
            </p>
        </Tooltip>
    );
};

export const UserSummary: React.FC<UserSummaryProps> = ({ user, userId, className = '' }) => {
    const primary = user?.username || user?.email || `用户 #${userId}`;
    const secondary = user?.username && user.email ? user.email : user?.tel || `用户 ID #${userId}`;
    const statusLabel = user ? (user.status === 1 ? '正常' : '已禁用') : '信息缺失';

    const content = (
        <div className="w-72 space-y-2 p-1 text-xs">
            <div>
                <p className="text-sm font-semibold">{primary}</p>
                <p className="break-all text-default-500">{user?.email || '未填写邮箱'}</p>
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1">
                <span className="text-default-500">用户 ID</span><span>#{userId}</span>
                <span className="text-default-500">联系电话</span><span>{user?.tel || '-'}</span>
                <span className="text-default-500">账号状态</span><span>{statusLabel}</span>
                <span className="text-default-500">注册时间</span>
                <span>{user?.created_at ? dayjs(user.created_at).format('YYYY-MM-DD HH:mm') : '-'}</span>
            </div>
        </div>
    );

    return (
        <Tooltip content={content} placement="top-start" delay={250} closeDelay={50}>
            <div className={`inline-flex min-w-0 max-w-64 cursor-help items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-default-100 ${className}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                    <CircleUserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-default-800">{primary}</p>
                    <p className="truncate text-xs text-default-500">{secondary}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-default-400">
                        <span>ID #{userId}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${user?.status === 0 ? 'bg-danger' : user ? 'bg-success' : 'bg-default-300'}`} />
                        <span>{statusLabel}</span>
                    </p>
                </div>
            </div>
        </Tooltip>
    );
};

export const PackageSummary: React.FC<PackageSummaryProps> = ({ packageInfo, packageId, className = '' }) => {
    const packageName = packageInfo?.package_name || `套餐 #${packageId}`;
    const content = (
        <div className="w-80 space-y-2 p-1 text-xs">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">{packageName}</p>
                    <p className="text-default-500">套餐 ID #{packageId}</p>
                </div>
                <Chip size="sm" variant="flat" color={packageInfo?.status === 0 ? 'danger' : 'success'}>
                    {packageInfo ? (packageInfo.status === 1 ? '上架中' : '已下架') : '信息缺失'}
                </Chip>
            </div>
            <div className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1">
                <span className="text-default-500">类别 / 等级</span><span>{packageInfo ? `${packageInfo.category} / ${packageInfo.level}` : '-'}</span>
                <span className="text-default-500">价格 / 时长</span><span>{packageInfo ? `${money(packageInfo.price)} / ${packageInfo.duration} 天` : '-'}</span>
                <span className="text-default-500">优先级</span><span>{packageInfo?.priority ?? '-'}</span>
            </div>
            <div>
                <p className="text-default-500">套餐说明</p>
                <p className="mt-0.5 whitespace-normal text-default-700">{packageInfo?.introduce || packageInfo?.remarks || '暂无说明'}</p>
            </div>
        </div>
    );

    return (
        <Tooltip content={content} placement="top-start" delay={250} closeDelay={50}>
            <div className={`inline-flex min-w-0 max-w-72 cursor-help items-start gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-default-100 ${className}`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary">
                    <Package className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-default-800">{packageName}</p>
                    {packageInfo ? (
                        <>
                            <p className="truncate text-xs text-default-500">{packageInfo.category} · {packageInfo.level}</p>
                            <p className="mt-0.5 text-[11px] text-default-400">{money(packageInfo.price)} · {packageInfo.duration} 天 · ID #{packageId}</p>
                        </>
                    ) : (
                        <p className="text-xs text-default-400">套餐 ID #{packageId}</p>
                    )}
                </div>
            </div>
        </Tooltip>
    );
};
