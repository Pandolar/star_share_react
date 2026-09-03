import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { ArrowLeft, ExternalLink, PlusSquare, Share, Smartphone } from 'lucide-react';

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

interface IOSEnvironment {
  isIOS: boolean;
  isSafari: boolean;
  isStandalone: boolean;
}

export const detectIOSEnvironment = (): IOSEnvironment => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const isIPadDesktopMode = platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || isIPadDesktopMode;
  const isStandalone = (window.navigator as IOSNavigator).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  const isAlternativeIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|MicroMessenger/i.test(userAgent);
  const isSafari = isIOS && /Safari/i.test(userAgent) && !isAlternativeIOSBrowser;
  return { isIOS, isSafari, isStandalone };
};

const IOSInstallPage: React.FC = () => {
  const [environment] = useState<IOSEnvironment>(detectIOSEnvironment);

  useEffect(() => {
    if (environment.isStandalone) {
      window.location.replace('/jumpns');
    }
  }, [environment.isStandalone]);

  if (environment.isStandalone) {
    return <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-sm text-default-500">正在打开 NiceAIGC...</div>;
  }

  if (!environment.isIOS || !environment.isSafari) {
    return <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-default-50 to-white px-5 py-10">
      <Card className="w-full max-w-md border border-default-200 shadow-sm">
        <CardBody className="items-center gap-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Smartphone className="h-8 w-8 text-primary" /></div>
          <div><h1 className="text-2xl font-bold text-default-900">请使用 iPhone Safari 打开</h1><p className="mt-3 text-sm leading-7 text-default-600">{environment.isIOS ? '当前浏览器不支持直接添加本网站应用。请点击浏览器菜单，选择“在 Safari 中打开”。' : '该入口适用于 iPhone 或 iPad。请在设备自带的 Safari 浏览器中访问当前网址。'}</p></div>
          <Button color="primary" variant="flat" startContent={<ArrowLeft className="h-4 w-4" />} onPress={() => window.location.assign('/')}>返回首页</Button>
        </CardBody>
      </Card>
    </main>;
  }

  return <main className="min-h-screen bg-white px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] text-default-900">
    <div className="mx-auto w-full max-w-md">
      <div className="mb-10 flex items-center gap-3"><img src="/img/logo.png" alt="NiceAIGC" className="h-9 w-9 rounded-lg" /><span className="text-lg font-semibold">NiceAIGC</span></div>
      <Chip color="primary" variant="flat" size="sm">iPhone / iPad</Chip>
      <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">添加 NiceAIGC<br />到主屏幕</h1>
      <p className="mt-4 text-base leading-7 text-default-500">添加后可像普通应用一样从桌面快速打开。首次添加只需完成下面两步。</p>

      <section className="mt-10 space-y-5">
        <Card shadow="none" className="border border-default-200"><CardBody className="gap-5 p-5">
          <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white">1</div><div><h2 className="text-lg font-semibold">轻触 Safari 底部的“分享”</h2><p className="mt-1 text-sm leading-6 text-default-500">分享按钮是一个向上箭头图标。</p></div></div>
          <div className="flex h-24 items-center justify-center rounded-2xl bg-default-50"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md"><Share className="h-7 w-7 text-primary" /></div></div>
        </CardBody></Card>

        <Card shadow="none" className="border border-default-200"><CardBody className="gap-5 p-5">
          <div className="flex items-start gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white">2</div><div><h2 className="text-lg font-semibold">选择“添加到主屏幕”</h2><p className="mt-1 text-sm leading-6 text-default-500">在分享菜单中向下滚动，然后轻触该选项并确认添加。</p></div></div>
          <div className="flex items-center justify-between rounded-2xl bg-default-50 px-5 py-4"><span className="font-medium">添加到主屏幕</span><PlusSquare className="h-7 w-7 text-default-700" /></div>
        </CardBody></Card>
      </section>

      <div className="mt-8 rounded-2xl bg-primary/5 p-4 text-sm leading-6 text-default-600">添加完成后，请直接从桌面打开 NiceAIGC。系统会自动识别主屏幕模式并进入应用。</div>
      <a href="https://support.apple.com/zh-sg/guide/iphone/iph42ab2f3a7/ios" target="_blank" rel="noreferrer" className="mt-6 flex items-center gap-2 text-sm font-medium text-primary"><ExternalLink className="h-4 w-4" />Apple 官方操作说明</a>
    </div>
  </main>;
};

export default IOSInstallPage;
