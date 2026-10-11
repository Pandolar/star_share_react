import React from 'react';
import CommissionWorkspace from '../../components/site/CommissionWorkspace';

export default function CommissionsManagePage() {
  return <section className="space-y-5"><header><h1 className="text-2xl font-semibold">代理佣金对账</h1><p className="mt-1 text-sm text-default-500">按北京时间统计订单与佣金账本；统计结果不代表已打款，当前月未截止时为临时数据。</p></header><CommissionWorkspace /></section>;
}
