import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, CardBody, Chip, Input, Modal, ModalBody, ModalContent,
  ModalFooter, ModalHeader, Select, SelectItem, Spinner, Table, TableBody,
  TableCell, TableColumn, TableHeader, TableRow, useDisclosure,
} from '@heroui/react';
import { Plus, RefreshCw, Store, Users } from 'lucide-react';
import distributorApiService, { SubAccount, SubCommissionConfig, SubSiteApproval } from '../../services/distributorApi';
import type { DistributorPackage } from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

const SubAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<SubAccount[]>([]);
  const [configs, setConfigs] = useState<SubCommissionConfig[]>([]);
  const [approvals, setApprovals] = useState<SubSiteApproval[]>([]);
  const [packages, setPackages] = useState<DistributorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const createModal = useDisclosure();
  const configModal = useDisclosure();
  const [form, setForm] = useState({ username: '', password: '', remarks: '' });
  const [configForm, setConfigForm] = useState<{ child_id: number | null; package_id: number | null; mode: 'fixed' | 'parent_rate'; value: string; revision: number; id: number | null }>({ child_id: null, package_id: null, mode: 'fixed', value: '', revision: 0, id: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [accountsRes, configsRes, approvalsRes, packagesRes] = await Promise.all([
        distributorApiService.getSubAccounts(),
        distributorApiService.getSubCommissions(),
        distributorApiService.getSubSiteApprovals(),
        distributorApiService.getPackages(),
      ]);
      for (const response of [accountsRes, configsRes, approvalsRes, packagesRes]) {
        if (response.code !== 20000) throw new Error(response.msg || '二级代理配置加载失败');
      }
      setAccounts(accountsRes.data || []);
      setConfigs(configsRes.data || []);
      setApprovals(approvalsRes.data || []);
      setPackages(packagesRes.data || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '二级代理配置加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const childName = (id: number) => accounts.find((account) => account.id === id)?.username || `#${id}`;
  const packageName = (id: number | null) => id === null ? '全部套餐（默认）' : (packages.find((item) => Number(item.package_id) === id)?.package_name || `#${id}`);

  const createAccount = async () => {
    setBusy(true);
    try {
      const response = await distributorApiService.createSubAccount({
        username: form.username.trim(),
        password: form.password,
        remarks: form.remarks.trim() || undefined,
      });
      if (response.code !== 20000) throw new Error(response.msg || '创建失败');
      showToast('二级代理已创建', 'success');
      createModal.onClose();
      setForm({ username: '', password: '', remarks: '' });
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '创建失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleAccount = async (account: SubAccount) => {
    setBusy(true);
    try {
      const action = account.status === 1 ? 'disable' : 'enable';
      const response = await distributorApiService.updateSubAccountStatus(account.id, action);
      if (response.code !== 20000) throw new Error(response.msg || '操作失败');
      showToast(action === 'disable' ? '已禁用，其站点同步暂停' : '已启用', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const reviewSite = async (site: SubSiteApproval, action: 'approve' | 'reject') => {
    setBusy(true);
    try {
      const response = await distributorApiService.reviewSubSite(site.id, action);
      if (response.code !== 20000) throw new Error(response.msg || '操作失败');
      showToast(action === 'approve' ? '站点已批准上线' : '已驳回该站点申请', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openConfigEditor = (childId: number, existing?: SubCommissionConfig) => {
    const config = existing || configs.find((row) => row.child_id === childId && row.package_id === null);
    setConfigForm({
      child_id: childId,
      package_id: config?.package_id ?? null,
      mode: config?.mode || 'fixed',
      value: config ? String(config.mode === 'parent_rate' ? Number(config.value) * 100 : config.value) : '',
      revision: config?.revision ?? 0,
      id: config?.id ?? null,
    });
    configModal.onOpen();
  };

  const selectConfigPackage = (packageId: number | null) => {
    const config = configs.find((row) => row.child_id === configForm.child_id && row.package_id === packageId);
    setConfigForm((current) => ({
      ...current, package_id: packageId,
      mode: config?.mode || current.mode,
      value: config ? String(config.mode === 'parent_rate' ? Number(config.value) * 100 : config.value) : '',
      revision: config?.revision ?? 0, id: config?.id ?? null,
    }));
  };

  const configValue = Number(configForm.value);
  const configValid = Boolean(configForm.value.trim()) && Number.isFinite(configValue)
    && (configForm.mode === 'fixed' ? configValue >= 0 && configValue <= 100000 : configValue > 0 && configValue <= 100);
  const exampleChildShare = configValid ? Math.min(50, configForm.mode === 'fixed' ? configValue : 50 * configValue / 100) : 0;

  const saveConfig = async () => {
    if (configForm.child_id === null) return;
    if (!configValid) {
      showToast(configForm.mode === 'fixed' ? '固定金额需在 0-100000 元之间' : '分佣比例需大于 0% 且不超过 100%', 'warning');
      return;
    }
    setBusy(true);
    try {
      const response = await distributorApiService.saveSubCommission({
        child_id: configForm.child_id,
        package_id: configForm.package_id,
        mode: configForm.mode,
        value: configForm.mode === 'parent_rate' ? String(configValue / 100) : configForm.value.trim(),
        revision: configForm.revision,
      });
      if (response.code !== 20000) throw new Error(response.msg || '保存失败');
      showToast('分佣配置已保存，只影响之后的新订单', 'success');
      configModal.onClose();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
      if (error instanceof Error && error.message.includes('已被其他人修改')) await load();
    } finally {
      setBusy(false);
    }
  };

  const deleteConfig = async (config: SubCommissionConfig) => {
    setBusy(true);
    try {
      const response = await distributorApiService.deleteSubCommission({ child_id: config.child_id, package_id: config.package_id });
      if (response.code !== 20000) throw new Error(response.msg || '删除失败');
      showToast('已删除该分佣配置', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">二级代理</h1>
            <p className="text-sm text-default-500">你给二级的分佣从你的佣金里出，平台只和你结算。</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button isIconOnly variant="light" aria-label="刷新" onPress={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
          <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={createModal.onOpen}>创建二级代理</Button>
        </div>
      </div>

      <Alert variant="flat" color="primary" title="从你的佣金中分配给二级" description="例如一笔订单总佣金为 ¥50，给二级 ¥30（或总佣金的 60%），你实得 ¥20。比例最高 100%；固定金额超过该笔总佣金时，以总佣金封顶，不会倒扣你的钱。指定套餐规则优先于默认规则，只影响之后的新订单。" />
      {error && <Alert color="danger" title="配置加载失败" description={error} endContent={<Button size="sm" variant="flat" onPress={() => void load()}>重试</Button>} />}

      {approvals.length > 0 && (
        <Card className="border-warning-200"><CardBody className="gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-warning" />待审批站点（{approvals.length}）</p>
          {approvals.map((site) => (
            <div key={site.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-default-100 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{site.name} <span className="text-xs text-default-400">{childName(site.distributor_id)}</span></p>
                <p className="text-xs text-default-500">{site.domains.join('、')}</p>
              </div>
              <Button size="sm" color="success" isDisabled={busy} onPress={() => void reviewSite(site, 'approve')}>批准上线</Button>
              <Button size="sm" color="danger" variant="flat" isDisabled={busy} onPress={() => void reviewSite(site, 'reject')}>驳回</Button>
            </div>
          ))}
        </CardBody></Card>
      )}

      <Card><CardBody className="gap-2">
        <p className="text-sm font-semibold">二级账号</p>
        <Table aria-label="二级代理账号" removeWrapper>
          <TableHeader>
            <TableColumn>账号</TableColumn><TableColumn>状态</TableColumn><TableColumn>站点</TableColumn><TableColumn>创建时间</TableColumn><TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody isLoading={loading} loadingContent={<Spinner />} emptyContent="还没有二级代理，点右上角创建">
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell><div><p className="font-medium">{account.username}</p>{account.remarks && <p className="text-xs text-default-400">{account.remarks}</p>}</div></TableCell>
                <TableCell><Chip size="sm" color={account.status === 1 ? 'success' : 'danger'} variant="flat">{account.status === 1 ? '启用' : '禁用'}</Chip></TableCell>
                <TableCell>{account.site_count}{account.pending_sites ? `（${account.pending_sites} 待审批）` : ''}</TableCell>
                <TableCell className="text-xs text-default-500">{account.created_at?.slice(0, 10) || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="flat" isDisabled={loading || Boolean(error)} onPress={() => openConfigEditor(account.id)}>分佣配置</Button>
                    <Button size="sm" color={account.status === 1 ? 'danger' : 'success'} variant="flat" isDisabled={busy} onPress={() => void toggleAccount(account)}>{account.status === 1 ? '禁用' : '启用'}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody></Card>

      <Card><CardBody className="gap-2">
        <p className="text-sm font-semibold">分佣配置</p>
        <Table aria-label="分佣配置" removeWrapper>
          <TableHeader>
            <TableColumn>二级代理</TableColumn><TableColumn>套餐</TableColumn><TableColumn>方式</TableColumn><TableColumn>数值</TableColumn><TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody isLoading={loading} loadingContent={<Spinner />} emptyContent="暂无配置；在「二级账号」里点分佣配置新增">
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>{childName(config.child_id)}</TableCell>
                <TableCell>{packageName(config.package_id)}</TableCell>
                <TableCell><Chip size="sm" variant="flat">{config.mode === 'fixed' ? '固定金额/单' : '按一级总佣金比例'}</Chip></TableCell>
                <TableCell>{config.mode === 'fixed' ? `¥${Number(config.value).toFixed(2)}` : `${Number((Number(config.value) * 100).toFixed(4))}%`}</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="light" onPress={() => openConfigEditor(config.child_id, config)}>编辑</Button>
                    <Button size="sm" color="danger" variant="light" isDisabled={busy} onPress={() => void deleteConfig(config)}>删除</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardBody></Card>

      <Modal isOpen={createModal.isOpen} onOpenChange={createModal.onOpenChange} size="sm">
        <ModalContent>
          <ModalHeader>创建二级代理</ModalHeader>
          <ModalBody className="gap-3">
            <Input label="登录用户名" placeholder="3-64位字母数字" value={form.username} onValueChange={(value) => setForm((current) => ({ ...current, username: value }))} isRequired />
            <Input label="初始密码" type="password" placeholder="至少12位" value={form.password} onValueChange={(value) => setForm((current) => ({ ...current, password: value }))} isRequired description="二级代理登录后可自行修改密码" />
            <Input label="备注（可选）" placeholder="只给你自己看" value={form.remarks} onValueChange={(value) => setForm((current) => ({ ...current, remarks: value }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={createModal.onClose}>取消</Button>
            <Button color="primary" isLoading={busy} isDisabled={!form.username.trim() || form.password.length < 12} onPress={() => void createAccount()}>创建</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={configModal.isOpen} onOpenChange={configModal.onOpenChange} size="sm">
        <ModalContent>
          <ModalHeader>分佣配置 · {configForm.child_id !== null ? childName(configForm.child_id) : ''}</ModalHeader>
          <ModalBody className="gap-3">
            <Select label="套餐" selectedKeys={[String(configForm.package_id ?? 'all')]} isDisabled={busy} onSelectionChange={(keys) => { const key = Array.from(keys)[0]; if (key !== undefined) selectConfigPackage(String(key) === 'all' ? null : Number(key)); }}>
              {[
                <SelectItem key="all">全部套餐（默认）</SelectItem>,
                ...packages.map((item) => <SelectItem key={String(item.package_id)}>{item.package_name}</SelectItem>),
              ]}
            </Select>
            <Select label="分佣方式" selectedKeys={[configForm.mode]} isDisabled={busy} onSelectionChange={(keys) => { const mode = Array.from(keys)[0]; if (mode) setConfigForm((current) => ({ ...current, mode: String(mode) as 'fixed' | 'parent_rate', value: '' })); }}>
              <SelectItem key="fixed">固定金额（每笔订单）</SelectItem>
              <SelectItem key="parent_rate">按一级总佣金的比例</SelectItem>
            </Select>
            <Input
              label={configForm.mode === 'fixed' ? '每笔订单分给二级（元）' : '分给二级的比例（%）'}
              type="number"
              min={0}
              max={configForm.mode === 'fixed' ? 100000 : 100}
              step={configForm.mode === 'fixed' ? '0.01' : '0.0001'}
              isDisabled={busy}
              value={configForm.value}
              onValueChange={(value) => setConfigForm((current) => ({ ...current, value }))}
              isRequired
              description={configForm.mode === 'fixed' ? '实际二级佣金以该笔总佣金封顶；0 表示不分配。' : '填写 60 表示将一级总佣金的 60% 分给二级，上限为 100%。'}
            />
            {configValid && <p className="text-sm text-default-600">以一笔总佣金 ¥50 为例：二级 ¥{exampleChildShare.toFixed(2)}，你实得 ¥{(50 - exampleChildShare).toFixed(2)}。</p>}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={configModal.onClose}>取消</Button>
            <Button color="primary" isLoading={busy} isDisabled={!configValid || Boolean(error)} onPress={() => void saveConfig()}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SubAccountsPage;
