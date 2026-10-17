import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { siteModeApi } from '../services/userApi';
import type { SiteFeatureName, SiteModePayload } from '../services/userApi';

export interface SiteState extends SiteModePayload {
  isWhiteLabel: boolean;
  loading: boolean;
  error: string | null;
  features: Record<SiteFeatureName, boolean>;
  enableRegister: boolean;
  enableWechatLogin: boolean;
  userAgreementUrl: string;
}

const featureNames: SiteFeatureName[] = ['register', 'wechat_login', 'invite', 'invite_rewards', 'activity', 'about', 'customer_service', 'team', 'promotion_code', 'invoice', 'cashback_credit', 'reset_quota', 'speedtest', 'online_purchase', 'cdk_exchange'];
const disabledFeatures = (): Record<SiteFeatureName, boolean> => featureNames.reduce<Record<SiteFeatureName, boolean>>((features, feature) => ({ ...features, [feature]: false }), {} as Record<SiteFeatureName, boolean>);

const defaultState: SiteState = {
  is_white_label: false,
  mode: 'normal', isWhiteLabel: false, site_id: null, distributor_id: null, site_name: '', branding: 'branded', sales_mode: 'online', status: 'active', logo_url: '', customer_service_url: '', loading: true, error: null,
  features: disabledFeatures(), notice: '', notice_id: '', enable_register: false, enable_wechat_login: false, enable_promotion_code: false, subscription_notice: '', user_agreement_url: '',
  enableRegister: false, enableWechatLogin: false, userAgreementUrl: '',
  payment_methods: [],
};

const WhiteLabelContext = createContext<SiteState>(defaultState);
export const useWhiteLabel = (): SiteState => useContext(WhiteLabelContext);
export const useSiteFeature = (feature: SiteFeatureName): boolean => useWhiteLabel().features[feature];


export const WhiteLabelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SiteState>(defaultState);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (document.hidden) return;
      void siteModeApi.getSiteMode().then((res) => {
        if (!mounted) return;
        if (res.code !== 20000 || !res.data) throw new Error(res.msg || '无法确认当前站点配置');
        const payload = res.data;
        const isWhiteLabel = payload.mode === 'whitelabel' || Boolean(payload.is_white_label);
        const features = { ...disabledFeatures(), ...payload.features };
        setState({ ...defaultState, ...payload, isWhiteLabel, loading: false, error: null, features, enableRegister: features.register, enableWechatLogin: features.wechat_login, userAgreementUrl: payload.user_agreement_url });
        if (isWhiteLabel) document.title = payload.site_name || '用户中心';
      }).catch((error: unknown) => {
        if (!mounted) return;
        setState({ ...defaultState, loading: false, error: error instanceof Error ? error.message : '无法确认当前站点配置' });
      });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { mounted = false; document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <WhiteLabelContext.Provider value={state}>{children}</WhiteLabelContext.Provider>;
};
