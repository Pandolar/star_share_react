import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from '@heroui/react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { getWechatQRCode, checkWechatLoginStatus } from '../../../../services/authApi';
import { userInfoApi } from '../../../../services/userApi';
import { getCookie } from '../../../../utils/cookies';

interface WechatBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBindSuccess: () => Promise<void> | void;
}

type QrStatus = 'loading' | 'active' | 'expired' | 'scanned' | 'registered';

export const WechatBindModal: React.FC<WechatBindModalProps> = ({ isOpen, onClose, onBindSuccess }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [qrStatus, setQrStatus] = useState<QrStatus>('loading');
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState('');

  const [showRegisteredConfirm, setShowRegisteredConfirm] = useState(false);
  const [pendingToken, setPendingToken] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bindingRef = useRef(false);

  const cleanupTimers = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const doBind = async (wechatTempToken: string) => {
    setBinding(true);
    bindingRef.current = true;
    try {
      const xuserid = getCookie('xuserid');
      const xtoken = getCookie('xtoken');
      if (!xuserid || !xtoken) throw new Error('用户信息获取失败');

      const response = await userInfoApi.wechatBind({
        is_bind: true,
        wechat_temp_token: wechatTempToken,
        xuserid: parseInt(xuserid),
        xtoken,
      });
      if (response.code === 20000) {
        await onBindSuccess();
        onClose();
      } else {
        setError(response.msg || '微信绑定失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '微信绑定失败');
    } finally {
      setBinding(false);
      bindingRef.current = false;
    }
  };

  const startPolling = (ticket: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      if (bindingRef.current) return;
      try {
        const statusData = await checkWechatLoginStatus(ticket);
        if (statusData?.wechat_temp_token) {
          setQrStatus('scanned');
          cleanupTimers();
          if (statusData.registered) {
            setPendingToken(statusData.wechat_temp_token);
            setShowRegisteredConfirm(true);
          } else {
            await doBind(statusData.wechat_temp_token);
          }
        } else if (statusData?.xtoken && statusData?.xuserid && !statusData?.wechat_temp_token) {
          setQrStatus('registered');
          setError('该微信已注册，无法绑定');
          cleanupTimers();
        }
      } catch (err: any) {
        if (err?.message?.includes('二维码已过期')) {
          setQrStatus('expired');
          cleanupTimers();
        }
      }
    }, 2000);
  };

  const fetchQR = async () => {
    setQrStatus('loading');
    setError('');
    cleanupTimers();
    try {
      const data = await getWechatQRCode('bind');
      setQrUrl(data.qr_code_url);
      setQrStatus('active');
      startPolling(data.ticket);

      timeoutRef.current = setTimeout(() => {
        setQrStatus('expired');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }, 2 * 60 * 1000);
    } catch {
      setQrStatus('expired');
      setError('获取微信二维码失败，请重试');
    }
  };

  // 弹窗开启时启动；关闭时清理
  useEffect(() => {
    if (isOpen) {
      fetchQR();
    } else {
      cleanupTimers();
      setShowRegisteredConfirm(false);
      setPendingToken('');
      setError('');
    }
    return cleanupTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    cleanupTimers();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-success" />
              <span>微信绑定</span>
            </div>
          </ModalHeader>
          <ModalBody className="text-center">
            <div className="space-y-4">
              <p className="text-sm text-default-600">使用微信扫描下方二维码完成绑定</p>
              {error && (
                <div className="p-2 bg-danger/10 border border-danger/20 rounded text-left">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-danger">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                {qrStatus === 'loading' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-default-50 border-2 border-dashed border-default-300 rounded-lg">
                    <div className="text-center">
                      <Spinner size="lg" />
                      <p className="text-sm text-default-500 mt-2">生成二维码中...</p>
                    </div>
                  </div>
                ) : qrStatus === 'active' ? (
                  <div className="relative">
                    <img src={qrUrl} alt="微信绑定二维码" className="w-48 h-48 border rounded-lg" />
                    {binding && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Spinner size="lg" color="white" />
                          <p className="text-sm mt-2">绑定中...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : qrStatus === 'scanned' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-green-50 border-2 border-green-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm text-green-600">扫码成功</p>
                      <p className="text-xs text-green-500">{showRegisteredConfirm ? '等待确认...' : '正在绑定中...'}</p>
                    </div>
                  </div>
                ) : qrStatus === 'registered' ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-warning-50 border-2 border-warning-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-warning-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-sm text-warning-600 mb-2">该微信已注册</p>
                      <p className="text-xs text-warning-500 mb-3">此微信号已绑定其他账户，无法重复绑定</p>
                      <button
                        onClick={fetchQR}
                        style={{
                          backgroundColor: '#006FEE',
                          color: '#ffffff',
                          border: '1px solid #006FEE',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        重新获取二维码
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-default-50 border-2 border-dashed border-default-300 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-default-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <p className="text-sm text-default-500 mb-2">二维码已过期</p>
                      <button
                        onClick={fetchQR}
                        style={{
                          backgroundColor: '#006FEE',
                          color: '#ffffff',
                          border: '1px solid #006FEE',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                        }}
                      >
                        刷新二维码
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-default-400">使用手机微信扫描二维码</p>
                <p className="text-xs text-default-400">
                  注意：如果被绑定的微信号之前注册过本平台，绑定后，之前微信注册的账号将无法登录！
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={handleClose}
              style={{
                backgroundColor: '#ffffff',
                color: '#404040',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showRegisteredConfirm} onClose={() => setShowRegisteredConfirm(false)} placement="center" size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-warning" />
              <span>确认绑定已注册微信</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2 text-sm text-default-700">
              <p>检测到该微信号已在本平台注册并绑定过其他账户。</p>
              <p className="text-warning-600">继续绑定后：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>该微信将与当前登录的邮箱账户绑定。</li>
                <li>之前绑定该微信的账户将无法再使用微信登录。</li>
              </ul>
              <p>请确认是否继续操作。</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowRegisteredConfirm(false)}
              style={{
                backgroundColor: '#ffffff',
                color: '#404040',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={async () => {
                const token = pendingToken;
                setShowRegisteredConfirm(false);
                if (token) await doBind(token);
              }}
              style={{
                backgroundColor: '#b45309',
                color: '#ffffff',
                border: '1px solid #b45309',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              继续绑定
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
