import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner, Card, CardBody, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Eye, EyeOff, Smartphone, Mail, RotateCcw, Send, AlertCircle, Shield } from 'lucide-react';
import { loginUser, getWechatQRCode, checkWechatLoginStatus, wechatBind } from '../../services/authApi';
import { setAuthCookies } from '../../utils/cookies';
import { toast } from '../../utils/toast';
import { userInfoApi } from '../../services/userApi';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';
import { useIsMobile } from '../../hooks/useIsMobile';

const USER_AGREEMENT_URL = 'https://r7r3bw489x.feishu.cn/wiki/Mq7FwBuhdiNH12kmqFvc4W0onqg';

const LoginPage: React.FC = () => {
  // 邮箱登录相关状态
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasAgreedUserAgreement, setHasAgreedUserAgreement] = useState(true);

  // 微信登录相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [ticket, setTicket] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrStatus, setQrStatus] = useState<'loading' | 'active' | 'expired' | 'scanned'>('loading');
  const [wechatTempToken, setWechatTempToken] = useState('');
  const [isWechatBinding, setIsWechatBinding] = useState(false);

  // 邮箱绑定相关状态（微信登录后强制绑定）
  const [showEmailBindModal, setShowEmailBindModal] = useState(false);
  const [bindEmail, setBindEmail] = useState('');
  const [bindEmailCode, setBindEmailCode] = useState('');
  const [bindPassword, setBindPassword] = useState('');
  const [bindPasswordConfirm, setBindPasswordConfirm] = useState('');
  const [bindEmailCodeSent, setBindEmailCodeSent] = useState(false);
  const [bindEmailCodeSending, setBindEmailCodeSending] = useState(false);
  const [bindCountdown, setBindCountdown] = useState(0);
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState('');
  const [showBindPassword, setShowBindPassword] = useState(false);
  const [showBindPasswordConfirm, setShowBindPasswordConfirm] = useState(false);
  const [showBindEmailCode, setShowBindEmailCode] = useState(false);

  // 轮询相关
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();
  const isMobile = useIsMobile();

  // 登录方式切换
  const [loginMethod, setLoginMethod] = useState<'wechat' | 'email'>('email');

  // 获取微信二维码
  const fetchWechatQR = async () => {
    if (!hasAgreedUserAgreement) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    setIsLoadingQR(true);
    setQrStatus('loading');

    // 清除之前的定时器
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }

    try {
      const data = await getWechatQRCode('login');
      setQrCodeUrl(data.qr_code_url);
      setTicket(data.ticket);
      setQrStatus('active');
      startPolling(data.ticket);

      // 设置2分钟后自动过期
      qrTimeoutRef.current = setTimeout(() => {
        setQrStatus('expired');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }, 2 * 60 * 1000); // 2分钟

    } catch (error) {
      console.error('获取微信二维码失败:', error);
      setQrStatus('expired');
      toast.error('获取微信二维码失败，请刷新重试');
    } finally {
      setIsLoadingQR(false);
    }
  };

  // 开始轮询检查二维码状态
  const startPolling = (currentTicket: string) => {
    // 清除之前的轮询
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('开始轮询二维码状态，ticket:', currentTicket);

    pollingIntervalRef.current = setInterval(async () => {
      // 如果正在进行微信绑定流程，跳过此次轮询
      if (isWechatBinding) {
        console.log('正在进行微信绑定，跳过此次轮询');
        return;
      }

      console.log('轮询检查二维码状态...');
      try {
        const statusData = await checkWechatLoginStatus(currentTicket);

        if (statusData) {
          setQrStatus('scanned');

          // 清除轮询
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // 清除过期定时器
          if (qrTimeoutRef.current) {
            clearTimeout(qrTimeoutRef.current);
            qrTimeoutRef.current = null;
          }

          if (statusData.wechat_temp_token) {
            // 新用户，需要通过wechat_bind接口进行绑定/登录
            console.log('检测到新用户，获取到wechat_temp_token，开始绑定流程:', statusData.wechat_temp_token);
            setWechatTempToken(statusData.wechat_temp_token);

            try {
              await handleWechatLogin(statusData.wechat_temp_token);
            } catch (loginError) {
              console.error('微信登录过程失败:', loginError);
              setQrStatus('expired');
            }
          } else if (statusData.xuserid && statusData.xtoken && statusData.xy_uuid_token) {
            // 老用户，直接获取到了完整的登录信息，可以直接登录
            console.log('检测到老用户，直接获取到登录信息，开始登录:', {
              xuserid: statusData.xuserid,
              xtoken: statusData.xtoken.substring(0, 8) + '...',
              xy_uuid_token: statusData.xy_uuid_token.substring(0, 8) + '...'
            });

            try {
              // 先设置临时cookies，以便调用getUserInfo接口
              setAuthCookies({
                xuserid: statusData.xuserid,
                xtoken: statusData.xtoken,
                xy_uuid_token: statusData.xy_uuid_token
              });

              // 检查用户邮箱是否需要绑定
              try {
                const userInfoResponse = await userInfoApi.getUserInfo();
                if (userInfoResponse.code === 20000) {
                  const userEmail = userInfoResponse.data.email;
                  console.log('老用户邮箱:', userEmail);

                  // 如果邮箱是@default.com，需要强制绑定
                  if (userEmail && userEmail.endsWith('@default.com')) {
                    console.log('检测到默认邮箱，需要绑定安全邮箱');
                    toast.info('为了账户安全，请绑定安全邮箱');
                    setShowEmailBindModal(true);
                    // 不跳转，等待用户绑定
                  } else {
                    // 邮箱已绑定，直接跳转
                    console.log('邮箱已绑定，直接跳转');
                    toast.success('微信登录成功！正在跳转...');
                    redirect();
                  }
                } else {
                  // 获取用户信息失败，为了安全起见，还是直接跳转
                  console.warn('获取用户信息失败，直接跳转');
                  toast.success('微信登录成功！正在跳转...');
                  redirect();
                }
              } catch (error) {
                console.error('检查用户邮箱失败:', error);
                // 出错时直接跳转
                toast.success('微信登录成功！正在跳转...');
                redirect();
              }
            } catch (loginError) {
              console.error('老用户登录过程失败:', loginError);
              toast.error('登录失败，请重试');
              setQrStatus('expired');
            }
          } else {
            console.error('获取到的登录数据格式异常:', statusData);
            toast.error('登录数据异常，请重试');
            setQrStatus('expired');
          }
        } else {
          // statusData 为 null，说明用户还没扫码，继续轮询
          console.log('用户还未扫码，继续轮询...');
        }
      } catch (error: any) {
        // 检查错误信息，如果是二维码过期，停止轮询
        if (error.message?.includes('二维码已过期')) {
          console.log('二维码已过期，停止轮询');
          setQrStatus('expired');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (qrTimeoutRef.current) {
            clearTimeout(qrTimeoutRef.current);
            qrTimeoutRef.current = null;
          }
        } else {
          // 其他网络错误或未知错误
          console.error('检查微信登录状态失败:', error);
        }
      }
    }, 2000); // 每2秒检查一次
  };

  // 处理微信登录（新用户绑定流程）
  const handleWechatLogin = async (tempToken: string) => {
    console.log('开始新用户微信绑定流程，tempToken:', tempToken);
    setIsWechatBinding(true);
    try {
      const data = await wechatBind({
        is_bind: false, // 不绑定，直接作为新用户登录
        wechat_temp_token: tempToken
      });

      console.log('新用户微信绑定API返回数据:', data);

      if (data && data.xuserid && data.xtoken && data.xy_uuid_token) {
        console.log('新用户微信绑定成功，设置临时cookies');
        // 先设置临时cookies，以便调用getUserInfo接口
        setAuthCookies({
          xuserid: data.xuserid,
          xtoken: data.xtoken,
          xy_uuid_token: data.xy_uuid_token
        });

        // 检查用户邮箱是否需要绑定
        try {
          const userInfoResponse = await userInfoApi.getUserInfo();
          if (userInfoResponse.code === 20000) {
            const userEmail = userInfoResponse.data.email;
            console.log('新用户邮箱:', userEmail);

            // 如果邮箱是@default.com，需要强制绑定
            if (userEmail && userEmail.endsWith('@default.com')) {
              console.log('检测到默认邮箱，需要绑定安全邮箱');
              toast.info('为了账户安全，请绑定安全邮箱');
              setShowEmailBindModal(true);
              // 不跳转，等待用户绑定
            } else {
              // 邮箱已绑定，直接跳转
              console.log('邮箱已绑定，直接跳转');
              toast.success('微信登录成功！正在跳转...');
              redirect();
            }
          } else {
            // 获取用户信息失败，为了安全起见，还是直接跳转
            console.warn('获取用户信息失败，直接跳转');
            toast.success('微信登录成功！正在跳转...');
            redirect();
          }
        } catch (error) {
          console.error('检查用户邮箱失败:', error);
          // 出错时直接跳转
          toast.success('微信登录成功！正在跳转...');
          redirect();
        }
      } else {
        console.error('新用户微信绑定返回数据不完整:', data);
        toast.error('登录数据异常，请重试');
        setQrStatus('expired');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      toast.error('微信登录失败，请刷新页面重新登录或联系客服');
      setQrStatus('expired');
    } finally {
      setIsWechatBinding(false);
    }
  };

  // 处理邮箱登录
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreedUserAgreement) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    if (!identifier || !password) {
      toast.warning('请输入邮箱/用户名和密码');
      return;
    }
    setIsLoggingIn(true);
    try {
      const data = await loginUser(identifier, password);
      if (data && data.xuserid && data.xtoken && data.xy_uuid_token) {
        setAuthCookies({
          xuserid: data.xuserid,
          xtoken: data.xtoken,
          xy_uuid_token: data.xy_uuid_token
        });
        toast.success('登录成功！正在跳转...');
        redirect();
      }
    } catch (error) {
      console.error('邮箱登录失败:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 刷新二维码
  const refreshQRCode = () => {
    fetchWechatQR();
  };

  // 发送邮箱绑定验证码
  const sendBindEmailCode = async () => {
    // 清空之前的错误
    setBindError('');

    // 验证邮箱是否为空
    if (!bindEmail.trim()) {
      setBindError('请输入邮箱地址');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(bindEmail.trim())) {
      setBindError('邮箱格式不正确，请检查后重新输入');
      return;
    }

    setBindEmailCodeSending(true);

    try {
      const response = await userInfoApi.sendEmailCode(bindEmail.trim());
      if (response.code === 20000) {
        setBindEmailCodeSent(true);
        setBindCountdown(60);
        toast.success('验证码已发送至您的邮箱，请查收');
      } else {
        setBindError(response.msg || '发送验证码失败，请稍后重试');
      }
    } catch (err) {
      setBindError(err instanceof Error ? err.message : '发送验证码失败，请检查网络后重试');
    } finally {
      setBindEmailCodeSending(false);
    }
  };

  // 提交邮箱绑定
  const handleSubmitEmailBind = async () => {
    // 清空之前的错误
    setBindError('');

    // 验证邮箱
    if (!bindEmail.trim()) {
      setBindError('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(bindEmail.trim())) {
      setBindError('邮箱格式不正确，请检查后重新输入');
      return;
    }

    // 验证验证码
    if (!bindEmailCode.trim()) {
      setBindError('请输入邮箱验证码');
      return;
    }

    // 验证验证码格式（只能是数字）
    if (!/^\d+$/.test(bindEmailCode.trim())) {
      setBindError('验证码只能是数字，请重新输入');
      return;
    }

    // 验证密码
    if (!bindPassword.trim()) {
      setBindError('请设置登录密码');
      return;
    }

    if (bindPassword.trim().length < 8) {
      setBindError('密码长度至少为8位');
      return;
    }

    // 验证确认密码
    if (!bindPasswordConfirm.trim()) {
      setBindError('请再次输入密码进行确认');
      return;
    }

    if (bindPassword !== bindPasswordConfirm) {
      setBindError('两次输入的密码不一致，请重新输入');
      return;
    }

    setBindLoading(true);

    try {
      const payload = {
        change_type: 'email' as const,
        email: bindEmail.trim(),
        email_code: bindEmailCode.trim(),
        password: btoa(bindPassword.trim())
      };

      const response = await userInfoApi.changeUserInfo(payload);

      if (response.code === 20000) {
        toast.success('邮箱绑定成功！正在跳转...');
        setShowEmailBindModal(false);
        // 绑定成功后跳转
        redirect();
      } else {
        setBindError(response.msg || '邮箱绑定失败，请重试');
      }
    } catch (err) {
      setBindError(err instanceof Error ? err.message : '邮箱绑定失败，请检查网络后重试');
    } finally {
      setBindLoading(false);
    }
  };

  // 处理登录方式切换
  const handleLoginMethodChange = (method: 'wechat' | 'email') => {
    setLoginMethod(method);
    // 如果切换到微信登录且还没有二维码，则获取二维码
    if (method === 'wechat' && !qrCodeUrl) {
      fetchWechatQR();
    }
  };

  // 邮箱绑定验证码倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bindCountdown > 0) {
      timer = setTimeout(() => setBindCountdown(bindCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [bindCountdown]);

  // 组件挂载时获取微信二维码
  useEffect(() => {
    if (!isLoggedIn && !qrCodeUrl && loginMethod === 'wechat') {
      fetchWechatQR();
    }
  }, [isLoggedIn, loginMethod]);

  // 如果用户取消勾选协议，停止二维码轮询并清空二维码状态
  useEffect(() => {
    if (hasAgreedUserAgreement) return;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }

    setIsLoadingQR(false);
    setQrCodeUrl('');
    setTicket('');
    setQrStatus('loading');
    setWechatTempToken('');
    setIsWechatBinding(false);
  }, [hasAgreedUserAgreement]);

  // 当登录方式切换时不需要清理二维码状态

  // 仅在组件卸载时清理所有定时器，避免切换登录方式时中断轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (qrTimeoutRef.current) {
        clearTimeout(qrTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AuthLayout title="登录您的账户">
      {isLoggedIn ? (
        <div className="text-center text-default-600">
          <p>您已登录，正在跳转...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 登录方式选择 */}
          <div className="flex space-x-1 bg-default-100 p-1 rounded-lg">
            <button
              onClick={() => handleLoginMethodChange('wechat')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'wechat'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-default-500 hover:text-default-700'
                }`}
            >
              <Smartphone size={16} />
              <span>微信登录</span>
            </button>
            <button
              onClick={() => handleLoginMethodChange('email')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'email'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-default-500 hover:text-default-700'
                }`}
            >
              <Mail size={16} />
              <span>邮箱登录</span>
            </button>
          </div>

          {/* 微信二维码登录 */}
          {loginMethod === 'wechat' && (
            <Card className="w-full">
              <CardBody className="flex flex-col items-center space-y-4 p-8">
                <h3 className="text-lg font-semibold text-default-800">微信扫码登录</h3>
                <p className="text-sm text-default-500 text-center">
                  使用微信扫描下方二维码即可快速登录
                </p>

                <div className="relative">
                  {!hasAgreedUserAgreement ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-default-50 border-2 border-dashed border-default-300 rounded-lg">
                      <div className="text-center px-4">
                        <p className="text-sm text-default-600">请先勾选同意《用户协议》</p>
                        <p className="text-xs text-default-400 mt-2">勾选后将自动生成二维码</p>
                      </div>
                    </div>
                  ) : qrStatus === 'loading' || isLoadingQR ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-default-50 border-2 border-dashed border-default-300 rounded-lg">
                      <div className="text-center">
                        <Spinner size="lg" />
                        <p className="text-sm text-default-500 mt-2">生成二维码中...</p>
                      </div>
                    </div>
                  ) : qrStatus === 'active' ? (
                    <div className="relative">
                      <img
                        src={qrCodeUrl}
                        alt="微信登录二维码"
                        className="w-48 h-48 border rounded-lg"
                      />
                      {isWechatBinding && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                          <div className="text-center text-white">
                            <Spinner size="lg" color="white" />
                            <p className="text-sm mt-2">登录中...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : qrStatus === 'scanned' ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-green-50 border-2 border-green-300 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <p className="text-sm text-green-600">扫码成功</p>
                        <p className="text-xs text-green-500">正在登录中...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-default-50 border-2 border-dashed border-default-300 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-default-400 rounded-full flex items-center justify-center mx-auto mb-2">
                          <RotateCcw className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-sm text-default-500 mb-2">二维码已过期</p>
                        <Button
                          size="sm"
                          color="primary"
                          variant="light"
                          onClick={refreshQRCode}
                          disabled={isLoadingQR || !hasAgreedUserAgreement}
                        >
                          {isLoadingQR ? <Spinner size="sm" /> : '刷新二维码'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs text-default-400">
                      若二维码过期或扫码后无反应请刷新！
                    </p>
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    variant="light"
                    onClick={refreshQRCode}
                    disabled={isLoadingQR || qrStatus === 'loading' || !hasAgreedUserAgreement}
                    className="text-xs"
                  >
                    {isLoadingQR ? <Spinner size="sm" /> : '刷新二维码'}
                  </Button>
                </div>

                <div className="w-full flex items-start gap-2 text-sm text-default-600">
                  <input
                    id="login-user-agreement-wechat"
                    type="checkbox"
                    checked={hasAgreedUserAgreement}
                    onChange={(e) => setHasAgreedUserAgreement(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-default-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="leading-5">
                    <label htmlFor="login-user-agreement-wechat" className="select-none">
                      登录即代表同意
                    </label>
                    <a
                      href={USER_AGREEMENT_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-1 text-primary-700 hover:text-primary-600 underline underline-offset-2"
                    >
                      《用户协议》
                    </a>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* 邮箱登录 */}
          {loginMethod === 'email' && (
            <Card className="w-full">
              <CardBody className="p-6">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <Input
                      label="邮箱"
                      placeholder="请输入您的邮箱"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      fullWidth
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="密码"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入您的密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      required
                      endContent={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="focus:outline-none"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-default-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-default-400" />
                          )}
                        </button>
                      }
                    />
                  </div>
                  <div className="flex items-start gap-2 text-sm text-default-600">
                    <input
                      id="login-user-agreement-email"
                      type="checkbox"
                      checked={hasAgreedUserAgreement}
                      onChange={(e) => setHasAgreedUserAgreement(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-default-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="leading-5">
                      <label htmlFor="login-user-agreement-email" className="select-none">
                        登录即代表同意
                      </label>
                      <a
                        href={USER_AGREEMENT_URL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="ml-1 text-primary-700 hover:text-primary-600 underline underline-offset-2"
                      >
                        《用户协议》
                      </a>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    color="primary"
                    fullWidth
                    disabled={isLoggingIn || !hasAgreedUserAgreement}
                    className="!mt-6"
                  >
                    {isLoggingIn ? <Spinner size="sm" color="white" /> : '登录'}
                  </Button>
                </form>

                {/* 邮箱登录底部链接 */}
                <div className="text-center mt-4 space-y-2">
                  <div className="flex flex-col items-center space-y-2">
                    <Link
                      to={`/forgot-password${location.search}`}
                      className="text-xs text-default-400 hover:text-primary-500 transition-colors"
                    >
                      找回密码
                    </Link>
                    <Link
                      to={`/register${location.search}`}
                      className="text-sm text-primary-700 hover:text-primary-600 font-medium"
                    >
                      还没有账户？
                      <span className="ml-1 text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2">
                        立即注册
                      </span>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}


        </div>
      )}

      {/* 邮箱绑定弹窗（微信登录后强制绑定） */}
      <Modal
        isOpen={showEmailBindModal}
        onClose={() => {}} // 不允许关闭
        isDismissable={false} // 禁止点击外部关闭
        hideCloseButton={true} // 隐藏关闭按钮
        placement="center"
        size="lg"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-primary" />
              <span>绑定安全邮箱</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-primary">
                    为了账户安全，请绑定您的安全邮箱并设置密码。绑定后可使用邮箱+密码登录。
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-default-700 mb-2">
                  邮箱地址 <span className="text-danger">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={bindEmail}
                    onChange={(e) => setBindEmail(e.target.value)}
                    placeholder="请输入您的邮箱地址"
                    variant="bordered"
                    isInvalid={!!bindError && !bindEmail.trim()}
                    className="flex-1"
                    type="email"
                  />
                  <button
                    onClick={sendBindEmailCode}
                    disabled={bindEmailCodeSending || bindCountdown > 0 || !bindEmail.trim()}
                    style={{
                      backgroundColor: bindEmailCodeSending || bindCountdown > 0 || !bindEmail.trim() ? '#d1d5db' : '#006FEE',
                      color: '#ffffff',
                      border: '1px solid #006FEE',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: bindEmailCodeSending || bindCountdown > 0 || !bindEmail.trim() ? 'not-allowed' : 'pointer',
                      minWidth: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'center'
                    }}
                  >
                    {bindEmailCodeSending ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <>
                        {!bindCountdown && <Send size={14} />}
                        {bindCountdown > 0 ? `${bindCountdown}s` : '发送验证码'}
                      </>
                    )}
                  </button>
                </div>
                {bindEmailCodeSent && (
                  <p className="text-xs text-success mt-1">
                    ✓ 验证码已发送至您的邮箱，请查收
                  </p>
                )}
                <p className="text-xs text-default-400 mt-1">
                  验证码为纯数字。未收到验证码？请检查垃圾箱或确认邮箱地址是否正确
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-default-700 mb-2">
                  邮箱验证码 <span className="text-danger">*</span>
                </label>
                <Input
                  value={bindEmailCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 只允许输入数字
                    if (value === '' || /^\d+$/.test(value)) {
                      setBindEmailCode(value);
                    }
                  }}
                  placeholder="请输入数字验证码"
                  variant="bordered"
                  type={showBindEmailCode ? "text" : "password"}
                  isInvalid={!!bindError && !bindEmailCode.trim()}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowBindEmailCode(!showBindEmailCode)}
                    >
                      {showBindEmailCode ? (
                        <EyeOff size={16} className="text-default-400" />
                      ) : (
                        <Eye size={16} className="text-default-400" />
                      )}
                    </button>
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-default-700 mb-2">
                  设置登录密码 <span className="text-danger">*</span>
                </label>
                <Input
                  value={bindPassword}
                  onChange={(e) => setBindPassword(e.target.value)}
                  placeholder="请输入密码，至少8位"
                  variant="bordered"
                  type={showBindPassword ? 'text' : 'password'}
                  isInvalid={!!bindError && !bindPassword.trim()}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowBindPassword(!showBindPassword)}
                    >
                      {showBindPassword ? (
                        <EyeOff size={16} className="text-default-400" />
                      ) : (
                        <Eye size={16} className="text-default-400" />
                      )}
                    </button>
                  }
                />
                <p className="text-xs text-default-400 mt-1">密码至少8位，用于邮箱+密码登录</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-default-700 mb-2">
                  确认密码 <span className="text-danger">*</span>
                </label>
                <Input
                  value={bindPasswordConfirm}
                  onChange={(e) => setBindPasswordConfirm(e.target.value)}
                  placeholder="请再次输入密码"
                  variant="bordered"
                  type={showBindPasswordConfirm ? 'text' : 'password'}
                  isInvalid={!!bindError && !bindPasswordConfirm.trim()}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowBindPasswordConfirm(!showBindPasswordConfirm)}
                    >
                      {showBindPasswordConfirm ? (
                        <EyeOff size={16} className="text-default-400" />
                      ) : (
                        <Eye size={16} className="text-default-400" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* 联系邮箱提示 */}
              <div className="p-3 bg-default/10 border border-default/20 rounded-lg">
                <p className="text-xs text-default-600 text-center">
                  有疑问请联系邮箱 <a href="mailto:admin@nice188.com" className="text-primary hover:underline">admin@nice188.com</a>，我们会尽快回复
                </p>
              </div>
            </div>

            {/* 错误提示 */}
            {bindError && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{bindError}</p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <button
              onClick={handleSubmitEmailBind}
              disabled={
                bindLoading ||
                !bindEmail.trim() ||
                !bindEmailCode.trim() ||
                !bindPassword.trim() ||
                !bindPasswordConfirm.trim() ||
                bindPassword !== bindPasswordConfirm ||
                bindPassword.length < 8
              }
              style={{
                backgroundColor:
                  bindLoading ||
                  !bindEmail.trim() ||
                  !bindEmailCode.trim() ||
                  !bindPassword.trim() ||
                  !bindPasswordConfirm.trim() ||
                  bindPassword !== bindPasswordConfirm ||
                  bindPassword.length < 8
                    ? '#d1d5db'
                    : '#006FEE',
                color: '#ffffff',
                border: '1px solid #006FEE',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor:
                  bindLoading ||
                  !bindEmail.trim() ||
                  !bindEmailCode.trim() ||
                  !bindPassword.trim() ||
                  !bindPasswordConfirm.trim() ||
                  bindPassword !== bindPasswordConfirm ||
                  bindPassword.length < 8
                    ? 'not-allowed'
                    : 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {bindLoading ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>绑定中...</span>
                </>
              ) : (
                '确认绑定'
              )}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthLayout>
  );
};

export default LoginPage;
