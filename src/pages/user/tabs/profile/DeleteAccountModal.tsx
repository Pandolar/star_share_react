import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Radio, RadioGroup, Spinner } from '@heroui/react';
import { AlertTriangle, Send } from 'lucide-react';
import { deleteAccountApi, type DeleteAccountPreview } from '../../../../services/userApi';
import { clearAuthCookies } from '../../../../utils/cookies';
import { toast } from '../../../../utils/toast';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

type VerificationMethod = 'password' | 'email' | 'wechat';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onDeleted }) => {
  const [preview, setPreview] = useState<DeleteAccountPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [credential, setCredential] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [qrUrl, setQrUrl] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const qrGeneration = useRef(0);
  const modalGeneration = useRef(0);

  const stopPolling = () => {
    qrGeneration.current += 1;
    if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  const loadPreview = async (generation: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await deleteAccountApi.preview();
      if (response.code !== 20000) throw new Error(response.msg || '无法加载注销条件');
      if (generation !== modalGeneration.current) return;
      setPreview(response.data);
      setMethod(response.data.verification_methods[0] || null);
    } catch (err) {
      if (generation === modalGeneration.current) {
        setError(err instanceof Error ? err.message : '无法加载注销条件');
      }
    } finally {
      if (generation === modalGeneration.current) setLoading(false);
    }
  };

  useEffect(() => {
    const generation = ++modalGeneration.current;
    stopPolling();
    if (!isOpen) return;
    setPreview(null); setError(''); setCredential(''); setQrUrl(''); setRiskAccepted(false); setConfirmation(''); setCountdown(0);
    void loadPreview(generation);
    return () => {
      if (modalGeneration.current === generation) modalGeneration.current += 1;
      stopPolling();
    };
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const sendCode = async () => {
    setCodeSending(true); setError('');
    try {
      const response = await deleteAccountApi.sendCode();
      if (response.code !== 20000) throw new Error(response.msg || '发送验证码失败');
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally { setCodeSending(false); }
  };

  const startWechatVerification = async () => {
    stopPolling();
    const requestGeneration = qrGeneration.current;
    const modalRequest = modalGeneration.current;
    setError(''); setCredential('');
    try {
      const response = await deleteAccountApi.wechatQr();
      if (requestGeneration !== qrGeneration.current || modalRequest !== modalGeneration.current) return;
      if (response.code !== 20000) throw new Error(response.msg || '获取微信二维码失败');
      setQrUrl(response.data.qr_code_url);
      pollTimer.current = window.setInterval(async () => {
        try {
          const statusResponse = await deleteAccountApi.wechatQrStatus(response.data.ticket);
          if (requestGeneration !== qrGeneration.current || modalRequest !== modalGeneration.current) return;
          if (statusResponse.code !== 20000) {
            stopPolling(); setError(statusResponse.msg || '微信验证已失效，请重新获取二维码'); return;
          }
          if (statusResponse.data.status === 'verified' && statusResponse.data.credential) {
            setCredential(statusResponse.data.credential); stopPolling();
          }
        } catch (err) {
          if (requestGeneration !== qrGeneration.current || modalRequest !== modalGeneration.current) return;
          stopPolling(); setError(err instanceof Error ? err.message : '微信验证失败，请重新获取二维码');
        }
      }, 2000);
    } catch (err) {
      if (requestGeneration === qrGeneration.current && modalRequest === modalGeneration.current) {
        setError(err instanceof Error ? err.message : '获取微信二维码失败');
      }
    }
  };

  useEffect(() => {
    if (!isOpen) { stopPolling(); return; }
    if (method === 'wechat' && preview && !qrUrl) void startWechatVerification();
    if (method !== 'wechat') stopPolling();
    // qrUrl 不应触发重启轮询；手动刷新按钮负责创建新二维码。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, method, preview]);

  const submit = async () => {
    if (!method || !credential || !riskAccepted || confirmation !== '永久注销') return;
    setSubmitting(true); setError('');
    try {
      const response = await deleteAccountApi.submit({ method, credential: method === 'password' ? btoa(credential) : credential, confirmation });
      if (response.code !== 20000 || !response.data.deleted) throw new Error(response.msg || '注销失败，请检查后重试');
      clearAuthCookies();
      toast.success('账号已注销');
      onDeleted();
    } catch (err) { setError(err instanceof Error ? err.message : '注销失败，请检查后重试'); }
    finally { setSubmitting(false); }
  };

  const blocked = !preview?.can_delete || Boolean(preview?.blockers.length);
  const canSubmit = Boolean(preview && !blocked && method && credential && riskAccepted && confirmation === '永久注销' && !submitting);

  return <Modal
    isOpen={isOpen}
    onClose={onClose}
    size="2xl"
    scrollBehavior="inside"
    isDismissable={!submitting}
    isKeyboardDismissDisabled={submitting}
    hideCloseButton={submitting}
  >
    <ModalContent>
      <ModalHeader className="flex items-center gap-2 text-danger"><AlertTriangle size={20} />注销账号</ModalHeader>
      <ModalBody>
        {loading && <div className="flex justify-center py-12"><Spinner label="正在加载注销条件..." /></div>}
        {error && <Alert color="danger" title={error} />}
        {preview && <div className="space-y-5">
          <Alert color="danger" variant="flat" title="此操作不可撤销" description="账号不可恢复，已购权益失效且不退款，所有数据均已物理销毁。同邮箱/微信重新注册为全新账号，不恢复旧数据或权益。" />
          <div className="rounded-lg border border-default-200 p-4 text-sm"><p className="mb-2 font-medium">注销将影响</p><div className="grid grid-cols-2 gap-2 text-default-600"><span>套餐：{preview.consequences.packages}</span><span>团队成员身份：{preview.consequences.team_memberships}</span><span>拥有的团队：{preview.consequences.owned_teams}</span><span>待处理订单：{preview.consequences.pending_orders}</span><span className="col-span-2">可用返现：{preview.consequences.cashback_available}</span></div></div>
          {blocked ? <Alert color="warning" title="暂时无法注销" description={<ul className="list-disc pl-4">{preview.blockers.map((item) => <li key={item.code}>{item.message}</li>)}</ul>} /> : <>
            <RadioGroup label="二次验证" value={method || undefined} onValueChange={(value) => { setMethod(value as VerificationMethod); setCredential(''); setQrUrl(''); }}>
              {preview.verification_methods.map((item) => <Radio key={item} value={item}>{item === 'password' ? '当前密码' : item === 'email' ? `邮箱验证码${preview.email ? `（${preview.email}）` : ''}` : '微信扫码验证'}</Radio>)}
            </RadioGroup>
            {method === 'password' && <Input label="当前密码" type="password" value={credential} onValueChange={setCredential} />}
            {method === 'email' && <div className="flex gap-2"><Input label="邮箱验证码" value={credential} onValueChange={setCredential} /><Button color="primary" variant="flat" isLoading={codeSending} isDisabled={codeSending || countdown > 0} onPress={sendCode} startContent={countdown ? undefined : <Send size={14} />}>{countdown > 0 ? `${countdown}s` : '发送验证码'}</Button></div>}
            {method === 'wechat' && <div className="space-y-3"><p className="text-sm text-default-600">请使用当前已绑定的微信扫码确认。</p>{qrUrl && <img src={qrUrl} alt="微信注销验证二维码" className="mx-auto h-44 w-44" />}{credential && <Alert color="success" title="微信验证成功" />}{!credential && <Button variant="flat" onPress={() => void startWechatVerification()}>刷新二维码</Button>}</div>}
            <Checkbox isSelected={riskAccepted} onValueChange={setRiskAccepted}>我已理解注销后无法恢复及上述全部影响</Checkbox>
            <Input label="请输入“永久注销”确认" value={confirmation} onValueChange={setConfirmation} />
          </>}
        </div>}
      </ModalBody>
      <ModalFooter><Button variant="light" onPress={onClose} isDisabled={submitting}>取消</Button><Button color="danger" onPress={submit} isDisabled={!canSubmit} isLoading={submitting}>永久注销账号</Button></ModalFooter>
    </ModalContent>
  </Modal>;
};
