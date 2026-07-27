import React, { useMemo } from 'react';
import { Accordion, AccordionItem, Button, Input, NumberInput, Select, SelectItem, Textarea } from '@heroui/react';
import { BadgeInfo, Footprints, Images, LayoutList, Plus, Sparkles, Trash2 } from 'lucide-react';
import { defaultHomeInfo } from '../../contexts/homeInfoDefaults';
import type { FeatureModel, FooterLinkGroup, HeroSlide, HomeInfo, NavAction } from '../../types/homeInfo';

interface Props { value: string; onChange: (value: string) => void; disabled?: boolean }
const GRADIENTS: Record<string, string> = {
  'from-purple-25 to-pink-25': '紫红柔光',
  'from-blue-25 to-cyan-25': '蓝青柔光',
  'from-green-25 to-emerald-25': '绿色柔光',
  'from-orange-25 to-amber-25': '橙黄柔光',
  'from-default-50 to-default-100': '中性灰',
};
const FEATURE_THEMES: Record<string, Pick<FeatureModel, 'color' | 'hoverColor' | 'badgeColor'>> = {
  blue: { color: 'bg-blue-50 text-blue-600', hoverColor: 'hover:bg-blue-100', badgeColor: 'bg-blue-100 text-blue-700' },
  green: { color: 'bg-green-50 text-green-600', hoverColor: 'hover:bg-green-100', badgeColor: 'bg-green-100 text-green-700' },
  violet: { color: 'bg-purple-50 text-purple-600', hoverColor: 'hover:bg-purple-100', badgeColor: 'bg-purple-100 text-purple-700' },
  orange: { color: 'bg-orange-50 text-orange-600', hoverColor: 'hover:bg-orange-100', badgeColor: 'bg-orange-100 text-orange-700' },
  red: { color: 'bg-red-50 text-red-600', hoverColor: 'hover:bg-red-100', badgeColor: 'bg-red-100 text-red-700' },
  gray: { color: 'bg-default-100 text-default-700', hoverColor: 'hover:bg-default-200', badgeColor: 'bg-default-200 text-default-700' },
};
const THEME_LABELS: Record<string, string> = { blue: '蓝色', green: '绿色', violet: '紫色', orange: '橙色', red: '红色', gray: '灰色' };
const ICONS = ['User', 'Globe', 'CreditCard', 'Zap', 'FileText', 'MessageSquare', 'Shield', 'Sparkles', 'Bot', 'Code'];
const SOCIAL_ICONS = ['Github', 'Twitter', 'Youtube', 'Mail', 'MessageCircle'];

const THEME_SELECT_LABELS: Record<string, string> = { ...THEME_LABELS, custom: '当前自定义样式' };
const hydrate = (source: Partial<HomeInfo>): HomeInfo => ({
  ...defaultHomeInfo,
  ...source,
  siteInfo: { ...defaultHomeInfo.siteInfo, ...(source.siteInfo || {}), contactInfo: { ...defaultHomeInfo.siteInfo.contactInfo, ...(source.siteInfo?.contactInfo || {}) } },
  navigation: { ...defaultHomeInfo.navigation, ...(source.navigation || {}), navActions: Array.isArray(source.navigation?.navActions) ? source.navigation!.navActions : defaultHomeInfo.navigation.navActions },
  hero: { ...defaultHomeInfo.hero, ...(source.hero || {}), slides: Array.isArray(source.hero?.slides) ? source.hero!.slides : defaultHomeInfo.hero.slides },
  features: { ...defaultHomeInfo.features, ...(source.features || {}), models: Array.isArray(source.features?.models) ? source.features!.models : defaultHomeInfo.features.models },
  footer: { ...defaultHomeInfo.footer, ...(source.footer || {}), footerLinks: source.footer?.footerLinks && typeof source.footer.footerLinks === 'object' ? source.footer.footerLinks : defaultHomeInfo.footer.footerLinks, socialLinks: Array.isArray(source.footer?.socialLinks) ? source.footer!.socialLinks : defaultHomeInfo.footer.socialLinks },
});
const nextId = (items: Array<{ id: number }>) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

export const HomeInfoConfigEditor: React.FC<Props> = ({ value, onChange, disabled }) => {
  const parsed = useMemo(() => {
    try { const source = JSON.parse(value || '{}'); return { config: hydrate(source && typeof source === 'object' ? source : {}), error: '' }; }
    catch { return { config: hydrate({}), error: '现有首页信息不是合法JSON；编辑后保存将恢复为页面所示内容。' }; }
  }, [value]);
  const config = parsed.config;
  const emit = (next: HomeInfo) => onChange(JSON.stringify(next, null, 2));
  const updateNav = (index: number, patch: Partial<NavAction>) => emit({ ...config, navigation: { ...config.navigation, navActions: config.navigation.navActions.map((item, i) => i === index ? { ...item, ...patch } : item) } });
  const updateSlide = (index: number, patch: Partial<HeroSlide>) => emit({ ...config, hero: { ...config.hero, slides: config.hero.slides.map((item, i) => i === index ? { ...item, ...patch } : item) } });
  const updateFeature = (index: number, patch: Partial<FeatureModel>) => emit({ ...config, features: { ...config.features, models: config.features.models.map((item, i) => i === index ? { ...item, ...patch } : item) } });
  const footerEntries = Object.entries(config.footer.footerLinks || {});

  return <div className="space-y-3">
    {parsed.error && <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger">{parsed.error}</div>}
    <Accordion variant="splitted" selectionMode="multiple" defaultExpandedKeys={['site']} itemClasses={{ base: 'shadow-none border border-divider' }}>
      <AccordionItem key="site" aria-label="网站基本信息" title="网站基本信息" subtitle="名称、Logo、公司与联系资料" startContent={<BadgeInfo className="h-5 w-5 text-primary" />}>
        <div className="grid gap-3 pb-4 sm:grid-cols-2">
          <Input label="网站名称" value={config.siteInfo.siteName} onValueChange={(siteName) => emit({ ...config, siteInfo: { ...config.siteInfo, siteName } })} isDisabled={disabled} />
          <Input label="公司名称" value={config.siteInfo.companyName} onValueChange={(companyName) => emit({ ...config, siteInfo: { ...config.siteInfo, companyName } })} isDisabled={disabled} />
          <Input label="Logo 图片地址" value={config.siteInfo.logoUrl} onValueChange={(logoUrl) => emit({ ...config, siteInfo: { ...config.siteInfo, logoUrl } })} isDisabled={disabled} className="sm:col-span-2" />
          <Textarea label="网站简介" value={config.siteInfo.description} onValueChange={(description) => emit({ ...config, siteInfo: { ...config.siteInfo, description } })} minRows={2} isDisabled={disabled} className="sm:col-span-2" />
          <Input label="联系邮箱" value={config.siteInfo.contactInfo.email || ''} onValueChange={(email) => emit({ ...config, siteInfo: { ...config.siteInfo, contactInfo: { ...config.siteInfo.contactInfo, email } } })} isDisabled={disabled} />
          <Input label="联系电话" value={config.siteInfo.contactInfo.phone || ''} onValueChange={(phone) => emit({ ...config, siteInfo: { ...config.siteInfo, contactInfo: { ...config.siteInfo.contactInfo, phone } } })} isDisabled={disabled} />
          <Input label="联系地址" value={config.siteInfo.contactInfo.address || ''} onValueChange={(address) => emit({ ...config, siteInfo: { ...config.siteInfo, contactInfo: { ...config.siteInfo.contactInfo, address } } })} isDisabled={disabled} className="sm:col-span-2" />
          <Input label="版权年份" value={config.siteInfo.copyrightYear} onValueChange={(copyrightYear) => emit({ ...config, siteInfo: { ...config.siteInfo, copyrightYear } })} isDisabled={disabled} />
          <Input label="ICP备案号" value={config.siteInfo.icpNumber || ''} onValueChange={(icpNumber) => emit({ ...config, siteInfo: { ...config.siteInfo, icpNumber } })} isDisabled={disabled} />
        </div>
      </AccordionItem>

      <AccordionItem key="navigation" aria-label="顶部导航" title="顶部导航" subtitle={`${config.navigation.navActions.length} 个导航按钮`} startContent={<LayoutList className="h-5 w-5 text-primary" />}>
        <div className="space-y-3 pb-4">
          {config.navigation.navActions.map((action, index) => <div key={index} className="grid gap-2 rounded-lg border border-divider p-3 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1.5fr_9rem_auto]">
            <Input label="按钮文字" value={action.name} onValueChange={(name) => updateNav(index, { name })} isDisabled={disabled} />
            <Select label="样式" selectedKeys={[action.type]} onSelectionChange={(keys) => updateNav(index, { type: String(Array.from(keys)[0] || 'text') as NavAction['type'] })} isDisabled={disabled}><SelectItem key="text">文字</SelectItem><SelectItem key="outline">描边</SelectItem><SelectItem key="solid">实心</SelectItem></Select>
            <Input label="链接地址" value={action.url} onValueChange={(url) => updateNav(index, { url })} isDisabled={disabled} />
            <Select label="打开方式" selectedKeys={[action.target]} onSelectionChange={(keys) => updateNav(index, { target: String(Array.from(keys)[0] || '_self') as NavAction['target'] })} isDisabled={disabled}><SelectItem key="_self">当前页</SelectItem><SelectItem key="_blank">新窗口</SelectItem></Select>
            <Button isIconOnly color="danger" variant="light" aria-label={`删除导航按钮 ${action.name}`} onPress={() => emit({ ...config, navigation: { ...config.navigation, navActions: config.navigation.navActions.filter((_, i) => i !== index) } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, navigation: { ...config.navigation, navActions: [...config.navigation.navActions, { name: '新按钮', type: 'text', url: '#', target: '_self' }] } })} isDisabled={disabled}>新增导航按钮</Button>
        </div>
      </AccordionItem>

      <AccordionItem key="hero" aria-label="首页轮播" title="首页轮播" subtitle={`${config.hero.slides.length} 张轮播图`} startContent={<Images className="h-5 w-5 text-primary" />}>
        <div className="space-y-3 pb-4">
          <NumberInput label="自动轮播间隔（秒）" value={Number(config.hero.autoPlayInterval || 6000) / 1000} onValueChange={(seconds) => emit({ ...config, hero: { ...config.hero, autoPlayInterval: Math.max(1, seconds || 1) * 1000 } })} minValue={1} maxValue={3600} step={1} className="max-w-xs" isDisabled={disabled} />
          {config.hero.slides.map((slide, index) => <div key={slide.id} className="space-y-3 rounded-lg border border-divider p-3"><div className="flex items-center justify-between"><p className="font-medium">轮播图 {index + 1}</p><Button isIconOnly color="danger" variant="light" aria-label={`删除轮播图 ${index + 1}`} onPress={() => emit({ ...config, hero: { ...config.hero, slides: config.hero.slides.filter((_, i) => i !== index) } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2">
            <Input label="主标题" value={slide.title} onValueChange={(title) => updateSlide(index, { title })} isDisabled={disabled} /><Input label="副标题" value={slide.subtitle} onValueChange={(subtitle) => updateSlide(index, { subtitle })} isDisabled={disabled} />
            <Textarea label="描述" value={slide.description} onValueChange={(description) => updateSlide(index, { description })} minRows={2} isDisabled={disabled} className="sm:col-span-2" />
            <Input label="图片地址" value={slide.image} onValueChange={(image) => updateSlide(index, { image })} isDisabled={disabled} className="sm:col-span-2" />
            <Select label="背景色" selectedKeys={[slide.gradient]} onSelectionChange={(keys) => updateSlide(index, { gradient: String(Array.from(keys)[0] || Object.keys(GRADIENTS)[0]) })} isDisabled={disabled}>{Object.entries({ ...GRADIENTS, ...(!(slide.gradient in GRADIENTS) ? { [slide.gradient]: '当前自定义样式' } : {}) }).map(([key, label]) => <SelectItem key={key}>{label}</SelectItem>)}</Select>
            <div />
            <Input label="主按钮文字" value={slide.ctaText} onValueChange={(ctaText) => updateSlide(index, { ctaText })} isDisabled={disabled} /><Input label="主按钮链接" value={slide.ctaUrl} onValueChange={(ctaUrl) => updateSlide(index, { ctaUrl })} isDisabled={disabled} />
            <Select label="主按钮打开方式" selectedKeys={[slide.ctaTarget || '_self']} onSelectionChange={(keys) => updateSlide(index, { ctaTarget: String(Array.from(keys)[0] || '_self') as HeroSlide['ctaTarget'] })} isDisabled={disabled}><SelectItem key="_self">当前页</SelectItem><SelectItem key="_blank">新窗口</SelectItem></Select><div />
            <Input label="次按钮文字" value={slide.learnMoreText} onValueChange={(learnMoreText) => updateSlide(index, { learnMoreText })} isDisabled={disabled} /><Input label="次按钮链接" value={slide.learnMoreUrl} onValueChange={(learnMoreUrl) => updateSlide(index, { learnMoreUrl })} isDisabled={disabled} />
            <Select label="次按钮打开方式" selectedKeys={[slide.learnMoreTarget || '_self']} onSelectionChange={(keys) => updateSlide(index, { learnMoreTarget: String(Array.from(keys)[0] || '_self') as HeroSlide['learnMoreTarget'] })} isDisabled={disabled}><SelectItem key="_self">当前页</SelectItem><SelectItem key="_blank">新窗口</SelectItem></Select>
          </div></div>)}
          <Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, hero: { ...config.hero, slides: [...config.hero.slides, { id: nextId(config.hero.slides), title: '新轮播图', subtitle: '', description: '', image: '', gradient: Object.keys(GRADIENTS)[0], ctaText: '了解详情', ctaUrl: '#', ctaTarget: '_self', learnMoreText: '', learnMoreUrl: '#', learnMoreTarget: '_self' }] } })} isDisabled={disabled}>新增轮播图</Button>
        </div>
      </AccordionItem>

      <AccordionItem key="features" aria-label="特点展示" title="特点展示" subtitle={`${config.features.models.length} 张特点卡片`} startContent={<Sparkles className="h-5 w-5 text-primary" />}>
        <div className="space-y-3 pb-4"><div className="grid gap-3 sm:grid-cols-2"><Input label="区域标题" value={config.features.title} onValueChange={(title) => emit({ ...config, features: { ...config.features, title } })} isDisabled={disabled} /><Input label="区域副标题" value={config.features.subtitle} onValueChange={(subtitle) => emit({ ...config, features: { ...config.features, subtitle } })} isDisabled={disabled} /></div>
          {config.features.models.map((model, index) => { const theme = Object.entries(FEATURE_THEMES).find(([, item]) => item.color === model.color && item.hoverColor === model.hoverColor && item.badgeColor === model.badgeColor)?.[0] || 'custom'; const iconOptions = ICONS.includes(model.icon) ? ICONS : [...ICONS, model.icon]; return <div key={model.id} className="space-y-3 rounded-lg border border-divider p-3"><div className="flex items-center justify-between"><p className="font-medium">特点卡片 {index + 1}</p><Button isIconOnly color="danger" variant="light" aria-label={`删除特点卡片 ${model.name}`} onPress={() => emit({ ...config, features: { ...config.features, models: config.features.models.filter((_, i) => i !== index) } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="名称" value={model.name} onValueChange={(name) => updateFeature(index, { name })} isDisabled={disabled} /><Select label="图标" selectedKeys={[model.icon]} onSelectionChange={(keys) => updateFeature(index, { icon: String(Array.from(keys)[0] || 'Sparkles') })} isDisabled={disabled}>{iconOptions.map((icon) => <SelectItem key={icon}>{icon}</SelectItem>)}</Select><Select label="主题色" selectedKeys={[theme]} onSelectionChange={(keys) => { const nextTheme = String(Array.from(keys)[0] || 'blue'); if (FEATURE_THEMES[nextTheme]) updateFeature(index, FEATURE_THEMES[nextTheme]); }} isDisabled={disabled}>{Object.entries(THEME_SELECT_LABELS).map(([key, label]) => <SelectItem key={key} startContent={FEATURE_THEMES[key] ? <span className={`h-3 w-3 rounded-sm ${FEATURE_THEMES[key].color.split(' ')[0]}`} /> : undefined}>{label}</SelectItem>)}</Select>
            <Textarea label="描述" value={model.description} onValueChange={(description) => updateFeature(index, { description })} minRows={2} isDisabled={disabled} className="sm:col-span-2 lg:col-span-3" /><Textarea label="特点标签（每行一个）" value={(model.features || []).join('\n')} onValueChange={(text) => updateFeature(index, { features: text.split('\n').map((item) => item.trim()).filter(Boolean) })} minRows={3} isDisabled={disabled} />
            <div className="space-y-3"><Input label="角标文字" value={model.badge} onValueChange={(badge) => updateFeature(index, { badge })} isDisabled={disabled} /><Input label="跳转链接" value={model.link} onValueChange={(link) => updateFeature(index, { link })} isDisabled={disabled} /></div>
          </div></div>; })}
          <Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, features: { ...config.features, models: [...config.features.models, { id: nextId(config.features.models), name: '新特点', description: '', features: [], icon: 'Sparkles', ...FEATURE_THEMES.blue, badge: '', link: '#' }] } })} isDisabled={disabled}>新增特点卡片</Button>
        </div>
      </AccordionItem>

      <AccordionItem key="footer" aria-label="页脚内容" title="页脚内容" subtitle="链接分组、社交链接" startContent={<Footprints className="h-5 w-5 text-primary" />}>
        <div className="space-y-4 pb-4"><div className="space-y-3"><div className="flex items-center justify-between"><p className="font-medium">页脚链接分组</p><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => { let name = '新分组'; let i = 2; while (name in config.footer.footerLinks) name = `新分组${i++}`; emit({ ...config, footer: { ...config.footer, footerLinks: { ...config.footer.footerLinks, [name]: [] } } }); }} isDisabled={disabled}>新增分组</Button></div>{footerEntries.map(([category, links], groupIndex) => <div key={groupIndex} className="space-y-2 rounded-lg border border-divider p-3"><div className="flex items-center gap-2"><Input label="分组名称" value={category} onValueChange={(nextName) => { const entries = footerEntries.map(([name, items], i) => [i === groupIndex ? nextName : name, items] as const); emit({ ...config, footer: { ...config.footer, footerLinks: Object.fromEntries(entries) as FooterLinkGroup } }); }} isDisabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除页脚分组 ${category}`} onPress={() => emit({ ...config, footer: { ...config.footer, footerLinks: Object.fromEntries(footerEntries.filter((_, i) => i !== groupIndex)) } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>{links.map((link, linkIndex) => <div key={linkIndex} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input label="链接文字" value={link.name} onValueChange={(name) => { const next = links.map((item, i) => i === linkIndex ? { ...item, name } : item); emit({ ...config, footer: { ...config.footer, footerLinks: { ...config.footer.footerLinks, [category]: next } } }); }} isDisabled={disabled} /><Input label="链接地址" value={link.href} onValueChange={(href) => { const next = links.map((item, i) => i === linkIndex ? { ...item, href } : item); emit({ ...config, footer: { ...config.footer, footerLinks: { ...config.footer.footerLinks, [category]: next } } }); }} isDisabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除页脚链接 ${link.name}`} onPress={() => emit({ ...config, footer: { ...config.footer, footerLinks: { ...config.footer.footerLinks, [category]: links.filter((_, i) => i !== linkIndex) } } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>)}<Button size="sm" variant="light" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, footer: { ...config.footer, footerLinks: { ...config.footer.footerLinks, [category]: [...links, { name: '新链接', href: '#' }] } } })} isDisabled={disabled}>新增链接</Button></div>)}</div>
          <div className="space-y-2"><div className="flex items-center justify-between"><p className="font-medium">社交链接</p><Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => emit({ ...config, footer: { ...config.footer, socialLinks: [...config.footer.socialLinks, { icon: 'Github', href: '#', label: '新链接' }] } })} isDisabled={disabled}>新增社交链接</Button></div>{config.footer.socialLinks.map((social, index) => { const options = SOCIAL_ICONS.includes(social.icon) ? SOCIAL_ICONS : [...SOCIAL_ICONS, social.icon]; return <div key={index} className="grid gap-2 sm:grid-cols-[10rem_1fr_2fr_auto]"><Select label="图标" selectedKeys={[social.icon]} onSelectionChange={(keys) => { const next = config.footer.socialLinks.map((item, i) => i === index ? { ...item, icon: String(Array.from(keys)[0] || 'Github') } : item); emit({ ...config, footer: { ...config.footer, socialLinks: next } }); }} isDisabled={disabled}>{options.map((icon) => <SelectItem key={icon}>{icon}</SelectItem>)}</Select><Input label="名称" value={social.label} onValueChange={(label) => { const next = config.footer.socialLinks.map((item, i) => i === index ? { ...item, label } : item); emit({ ...config, footer: { ...config.footer, socialLinks: next } }); }} isDisabled={disabled} /><Input label="链接地址" value={social.href} onValueChange={(href) => { const next = config.footer.socialLinks.map((item, i) => i === index ? { ...item, href } : item); emit({ ...config, footer: { ...config.footer, socialLinks: next } }); }} isDisabled={disabled} /><Button isIconOnly color="danger" variant="light" aria-label={`删除社交链接 ${social.label}`} onPress={() => emit({ ...config, footer: { ...config.footer, socialLinks: config.footer.socialLinks.filter((_, i) => i !== index) } })} isDisabled={disabled}><Trash2 className="h-4 w-4" /></Button></div>; })}</div>
        </div>
      </AccordionItem>
    </Accordion>
  </div>;
};
