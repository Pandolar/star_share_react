/**
 * Home页面信息类型定义
 */

// 导航按钮类型
export type ButtonType = 'text' | 'outline' | 'solid';
export type TargetType = '_blank' | '_self';

// 导航动作配置
export interface NavAction {
  name: string;
  type: ButtonType;
  url: string;
  target: TargetType;
}

// Hero轮播幻灯片数据
export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  gradient: string;
  ctaText: string;
  ctaUrl: string;
  learnMoreText: string;
  learnMoreUrl: string;
}

// 特点/模型展示数据
export interface FeatureModel {
  id: number;
  name: string;
  description: string;
  features: string[];
  icon: string; // 图标名称，如 'User', 'Globe', 'CreditCard' 等
  color: string;
  hoverColor: string;
  badge: string;
  badgeColor: string;
  link: string;
}

// 页脚链接分组
export interface FooterLinkGroup {
  [category: string]: Array<{
    name: string;
    href: string;
  }>;
}

// 社交媒体链接
export interface SocialLink {
  icon: string; // 图标名称
  href: string;
  label: string;
}

// 联系信息
export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

// 网站基本信息
export interface SiteInfo {
  siteName: string;
  logoUrl: string;
  description: string;
  companyName: string;
  contactInfo: ContactInfo;
  copyrightYear: string;
  icpNumber?: string;
}

// LatestModels区域配置
export interface LatestModelsSection {
  title: string;
  subtitle: string;
  models: FeatureModel[];
}

// Home页面完整信息结构
export interface HomeInfo {
  // 网站基本信息
  siteInfo: SiteInfo;
  
  // 导航菜单配置
  navigation: {
    navActions: NavAction[];
  };
  
  // Hero轮播区域
  hero: {
    slides: HeroSlide[];
    autoPlayInterval: number;
  };
  
  // 特点展示区域
  features: LatestModelsSection;
  
  // 页脚信息
  footer: {
    footerLinks: FooterLinkGroup;
    socialLinks: SocialLink[];
  };
}

// API响应类型
export interface HomeInfoResponse {
  code: number;
  msg: string;
  data: {
    notice: string;
    home_info: HomeInfo;
  };
} 