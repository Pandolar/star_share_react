import React from 'react';
import CommissionWorkspace from '../../components/site/CommissionWorkspace';

const DistributorCommissionsPage: React.FC = () => (
    <div className="space-y-6">
        <header>
            <h1 className="text-2xl font-semibold">佣金对账</h1>
            <p className="mt-1 text-sm text-default-500">核对每月销售与佣金，打款在线下与平台沟通，累计净佣金不会因打款清零。</p>
        </header>
        <CommissionWorkspace distributor />
    </div>
);

export default DistributorCommissionsPage;
