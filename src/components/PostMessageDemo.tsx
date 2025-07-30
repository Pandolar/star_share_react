/**
 * PostMessage 功能演示组件
 * 用于测试和演示 postMessage 通信功能
 */
import React, { useState } from 'react';
import { Card, CardBody, Button, Input, Textarea } from '@heroui/react';
import {
    postNavigate,
    postMessageToParent,
    notifyLogout,
    getPostMessageConfig,
    logoutAndNotify
} from '../utils/postMessage';

export const PostMessageDemo: React.FC = () => {
    const [url, setUrl] = useState('https://example.com');
    const [customMessage, setCustomMessage] = useState('{"action": "test", "data": "hello"}');

    const handleNavigate = (newWindow: boolean) => {
        postNavigate(url, newWindow);
    };

    const handleLogoutNotify = () => {
        notifyLogout();
    };

    const handleCustomMessage = () => {
        try {
            const message = JSON.parse(customMessage);
            postMessageToParent(message);
        } catch (error) {
            alert('JSON 格式错误: ' + error);
        }
    };

    const handleQuickLogout = () => {
        logoutAndNotify();
    };

    const currentConfig = getPostMessageConfig();

    return (
        <div className="space-y-6 p-6">
            <Card>
                <CardBody>
                    <h3 className="text-lg font-semibold mb-4">PostMessage 功能演示</h3>

                    {/* 当前配置显示 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">当前配置 (简化版):</h4>
                        <pre className="text-sm text-gray-600">
                            {JSON.stringify(currentConfig, null, 2)}
                        </pre>
                    </div>

                    {/* 导航功能测试 */}
                    <div className="mb-6">
                        <h4 className="font-medium mb-3">1. 页面导航测试</h4>
                        <div className="flex gap-3 items-end">
                            <Input
                                label="目标URL"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button color="primary" onClick={() => handleNavigate(false)}>
                                当前窗口跳转
                            </Button>
                            <Button color="secondary" onClick={() => handleNavigate(true)}>
                                新窗口打开
                            </Button>
                        </div>
                    </div>

                    {/* 退出登录通知 */}
                    <div className="mb-6">
                        <h4 className="font-medium mb-3">2. 退出登录通知</h4>
                        <div className="flex gap-3">
                            <Button color="danger" variant="light" onClick={handleLogoutNotify}>
                                仅发送通知
                            </Button>
                            <Button color="danger" onClick={handleQuickLogout}>
                                完整退出登录
                            </Button>
                        </div>
                    </div>

                    {/* 自定义消息 */}
                    <div className="mb-6">
                        <h4 className="font-medium mb-3">3. 自定义消息测试</h4>
                        <div className="flex gap-3 items-end">
                            <Textarea
                                label="自定义消息 (JSON格式)"
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={3}
                                className="flex-1"
                            />
                            <Button color="success" onClick={handleCustomMessage}>
                                发送消息
                            </Button>
                        </div>
                    </div>

                    {/* 使用说明 */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2 text-blue-800">💡 使用说明 (简化版):</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• 导航功能: 向父页面发送跳转指令（使用 '*' 作为目标）</li>
                            <li>• 退出通知: 在退出登录时通知父页面</li>
                            <li>• 自定义消息: 发送任意JSON格式的消息到父页面</li>
                            <li>• 无需配置: 所有消息都使用 '*' 作为 targetOrigin</li>
                            <li>• 兼容性: 适配外部主网页的简化监听逻辑</li>
                        </ul>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}; 