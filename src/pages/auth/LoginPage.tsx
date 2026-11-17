import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { Input, Button, Spinner, Card, CardBody } from '@heroui/react';
import { Eye, EyeOff, Smartphone, Mail, RotateCcw, AlertCircle } from 'lucide-react';
import { loginUser, getWechatQRCode, checkWechatLoginStatus, wechatBind } from '../../services/authApi';
import { setAuthCookies } from '../../utils/cookies';
import { toast } from '../../utils/toast';
import { userInfoApi } from '../../services/userApi';
import { useAutoLogin } from '../../hooks/useAutoLogin';
import { useRedirect } from '../../hooks/useRedirect';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';
import { UserAgreementConsent, useUserAgreementRequirement } from '../../components/UserAgreementConsent';
import { WechatEmailBindModal } from '../../components/auth/WechatEmailBindModal';


const LoginPage: React.FC = () => {
  // 邮箱登录相关状态
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasAgreedUserAgreement, setHasAgreedUserAgreement] = useState(true);

  // 微信登录相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrStatus, setQrStatus] = useState<'loading' | 'active' | 'expired' | 'scanned'>('loading');
  const [isWechatBinding, setIsWechatBinding] = useState(false);

  // 微信登录后强制绑定邮箱
  const [showEmailBindModal, setShowEmailBindModal] = useState(false);
  const [wechatLoginError, setWechatLoginError] = useState('');

  // 轮询相关
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLoggedIn = useAutoLogin();
  const redirect = useRedirect();
  const location = useLocation();

  // 登录方式切换
  const [loginMethod, setLoginMethod] = useState<'wechat' | 'email'>('email');
  const { enableRegister, enableWechatLogin } = useWhiteLabel();
  const { isRequired: isAgreementRequired } = useUserAgreementRequirement();
  const showWechatLogin = enableWechatLogin;
  const [wechatConfirmed, setWechatConfirmed] = useState(false);

  // 获取微信二维码
  const fetchWechatQR = async () => {
    if (isAgreementRequired && !hasAgreedUserAgreement) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    setIsLoadingQR(true);
    setWechatLoginError('');
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

            try {
              await handleWechatLogin(
                statusData.wechat_temp_token,
                statusData.re_registration_available,
              );
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
                  // 后端根据开关返回强制绑定标记
                  if (userInfoResponse.data.email_bind_required) {
                    console.log('检测到微信账号需要绑定安全邮箱');
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
        // 检查错误信息，如果是二维码过期或微信新用户已关闭，停止轮询
        if (error.message?.includes('二维码已过期') || error.message?.includes('新用户注册')) {
          console.log('二维码不可用，停止轮询:', error.message);
          if (error.message?.includes('新用户注册')) {
            setWechatLoginError(error.message);
          }
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
  const handleWechatLogin = async (tempToken: string, reRegistrationAvailable = false) => {
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
        if (data.re_registered || reRegistrationAvailable) {
          toast.info('已创建全新账号，不继承原账号的数据或权益。');
        }

        // 检查用户邮箱是否需要绑定
        try {
          const userInfoResponse = await userInfoApi.getUserInfo();
          if (userInfoResponse.code === 20000) {
            // 后端根据开关返回强制绑定标记
            if (userInfoResponse.data.email_bind_required) {
              console.log('检测到微信账号需要绑定安全邮箱');
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
    if (isAgreementRequired && !hasAgreedUserAgreement) {
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

  // 处理登录方式切换
  const handleLoginMethodChange = (method: 'wechat' | 'email') => {
    setLoginMethod(method);
    // 切回邮箱登录时重置微信确认态，再次切回微信 Tab 仍需重新确认
    if (method === 'email') {
      setWechatConfirmed(false);
    }
    // 切到微信 Tab 不再立即拉取二维码，要等用户点击“继续使用微信登录”
  };

  // 微信确认继续使用：拉二维码并展示
  const confirmUseWechat = () => {
    setWechatConfirmed(true);
    if (!qrCodeUrl) {
      fetchWechatQR();
    }
  };

  // 组件挂载时不再自动拉取二维码：用户需先点击"继续使用微信登录"

  // 如果用户取消勾选协议，停止二维码轮询并清空二维码状态
  useEffect(() => {
    if (!isAgreementRequired || hasAgreedUserAgreement) return;

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
    setQrStatus('loading');
    setIsWechatBinding(false);
  }, [hasAgreedUserAgreement, isAgreementRequired]);

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
          {/* 登录方式选择（白牌或微信登录关闭时仅显示邮箱登录） */}
          {showWechatLogin && (
          <div className="flex space-x-1 bg-default-100 p-1 rounded-lg">
            <button
              onClick={() => handleLoginMethodChange('email')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${loginMethod === 'email'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-default-500 hover:text-default-700'
                }`}
            >
              <Mail size={16} />
              <span>邮箱登录</span>
              <span className="ml-1 hidden sm:inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-700">
                推荐
              </span>
            </button>
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
          </div>
          )}

          {/* 微信二维码登录 */}
          {showWechatLogin && loginMethod === 'wechat' && !wechatConfirmed && (
            <Card className="w-full">
              <CardBody className="flex flex-col items-center space-y-5 p-6 sm:p-8">
                <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
                  <AlertCircle size={24} className="text-warning" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-default-800">不建议使用微信登录</h3>
                  <p className="text-sm text-default-600 leading-6">
                    为了账户安全和长期可用，推荐使用<span className="font-semibold text-primary-600">邮箱登录</span>。如果你之前用邮箱注册过本站，请直接使用邮箱登录，避免创建重复账号。
                  </p>
                </div>
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <Button
                    color="primary"
                    fullWidth
                    onPress={() => handleLoginMethodChange('email')}
                  >
                    切回邮箱登录
                  </Button>
                  <Button
                    variant="bordered"
                    fullWidth
                    onPress={confirmUseWechat}
                  >
                    继续使用微信登录
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {showWechatLogin && loginMethod === 'wechat' && wechatConfirmed && (
            <Card className="w-full">
              <CardBody className="flex flex-col items-center space-y-4 p-8">
                <h3 className="text-lg font-semibold text-default-800">微信扫码登录</h3>
                <div className="w-full flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-700 leading-5">
                    如果你用邮箱注册过本站，请直接用<span className="font-semibold">邮箱登录</span>，避免创建重复账号。
                  </p>
                </div>

                <div className="relative">
                  {isAgreementRequired && !hasAgreedUserAgreement ? (
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
                          disabled={isLoadingQR || (isAgreementRequired && !hasAgreedUserAgreement)}
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
                    disabled={isLoadingQR || qrStatus === 'loading' || (isAgreementRequired && !hasAgreedUserAgreement)}
                    className="text-xs"
                  >
                    {isLoadingQR ? <Spinner size="sm" /> : '刷新二维码'}
                  </Button>
                </div>

                <UserAgreementConsent isSelected={hasAgreedUserAgreement} onValueChange={setHasAgreedUserAgreement} className="w-full" />
              </CardBody>
            </Card>
          )}

          {showWechatLogin && loginMethod === 'wechat' && wechatLoginError && (
            <Card className="w-full border border-warning/30">
              <CardBody className="space-y-3 p-5">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-warning" />
                  <p className="text-sm text-default-700">{wechatLoginError}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button color="primary" fullWidth onPress={() => handleLoginMethodChange('email')}>
                    使用邮箱登录
                  </Button>
                  {enableRegister && (
                    <Button as={Link} to={`/register${location.search}`} variant="bordered" fullWidth>
                      注册邮箱账号
                    </Button>
                  )}
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
                  <UserAgreementConsent isSelected={hasAgreedUserAgreement} onValueChange={setHasAgreedUserAgreement} />
                  <Button
                    type="submit"
                    color="primary"
                    fullWidth
                    disabled={isLoggingIn || (isAgreementRequired && !hasAgreedUserAgreement)}
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
                    {enableRegister && (
                      <Link
                        to={`/register${location.search}`}
                        className="text-sm text-primary-700 hover:text-primary-600 font-medium"
                      >
                        还没有账户？
                        <span className="ml-1 text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2">
                          立即注册
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}


        </div>
      )}

      <WechatEmailBindModal
        isOpen={showEmailBindModal}
        onSuccess={() => {
          setShowEmailBindModal(false);
          redirect();
        }}
        onUseEmailLogin={() => {
          setShowEmailBindModal(false);
          handleLoginMethodChange('email');
        }}
      />
    </AuthLayout>
  );
};

export default LoginPage;
