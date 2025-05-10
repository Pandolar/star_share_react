"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem 
} from "@/components/ui/carousel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState, useRef } from "react"

// AI模型数据
const aiModels = [
  { 
    name: "ChatGPT",
    description: "OpenAI强大的对话模型，处理各类语言任务",
    details: "支持GPT-3.5和GPT-4，具备强大的上下文理解能力和知识库。可处理代码、文案创作、语言翻译等多种任务，回答精确且自然。",
    capabilities: ["上下文理解", "代码编程", "多语言支持", "文本生成"],
    color: "bg-gradient-to-r from-green-500 to-teal-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    )
  },
  { 
    name: "Claude",
    description: "Anthropic的AI助手，擅长长文本理解与推理",
    details: "Claude以其卓越的长文本处理能力和推理能力见长，支持200K上下文窗口。善于复杂文档分析、逻辑推理和创意写作，回答风格更趋人性化和友好。",
    capabilities: ["长文档处理", "逻辑推理", "安全对齐", "有效沟通"],
    color: "bg-gradient-to-r from-purple-500 to-indigo-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.7938 12.6289C21.3413 11.492 21.6539 10.0892 21.5337 9.14249L21.3826 7.90722L20.2294 8.39194C19.0762 8.87666 16.4986 10.03 14.4359 9.87259C12.9627 9.75607 11.8582 9.2043 11.1025 8.29146L10.531 7.60818L9.82752 8.13582C9.4243 8.43892 9.06498 8.76792 8.75264 9.14249L8.13731 9.87259H6.93022C4.57954 9.87259 2.70508 11.7511 2.70508 14.1068V14.1067C2.70508 16.4623 4.57954 18.3408 6.93022 18.3408H17.5857C19.9364 18.3408 21.8108 16.4623 21.8108 14.1067V14.1068C21.8108 13.5592 21.5688 13.0286 21.1942 12.6071L19.7939 12.6289L19.7938 12.6289Z" />
        <path d="M12.254 4C12.254 3.2995 12.6266 2.66744 13.2204 2.30304L13.7193 2C13.1241 2.30752 12.3774 2.3074 11.7823 2L12.2845 2.30432C12.8762 2.66848 13.2473 3.29982 13.2473 3.99932C13.2473 5.06346 12.4162 5.92598 11.3894 5.97444L11.0568 5.99274C9.94862 6.05122 9.03864 6.9952 9.03864 8.13452C9.03864 8.72468 9.25012 9.27206 9.61148 9.69148L10.0578 10.1999C9.82914 9.87346 9.69324 9.47352 9.69324 9.04422C9.69324 7.97988 10.5244 7.11746 11.3507 7.06982L11.6832 7.05152C12.7934 6.99128 13.704 6.0483 13.704 4.90996C13.704 4.32104 13.4935 3.77472 13.1335 3.3558L12.6856 2.84584C13.5234 3.92284 13.3395 5.47152 12.2548 6.31352L11.9907 6.51488C12.9873 5.93084 13.2606 4.6093 12.254 4Z" />
      </svg>
    )
  },
  { 
    name: "Deepseek",
    description: "专为深度思考设计的AI，解决复杂问题",
    details: "Deepseek系列模型在科研、数学和编程领域表现卓越。具备优秀的中文能力和领先的编程能力，尤其擅长解决需要深度思考的复杂问题和技术挑战。",
    capabilities: ["科研能力", "数学推导", "编程优化", "复杂推理"],
    color: "bg-gradient-to-r from-blue-500 to-sky-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm.97-7.57c-.44.58-.75.99-.87 1.43-.12.44-.19.89-.19 1.14h-2c0-.5.16-1.14.41-1.84.25-.71.63-1.21 1.12-1.68.5-.47.84-.82 1.04-1.12.19-.29.5-.75.5-1.26 0-.66-.22-1.2-.65-1.61-.44-.41-1.04-.62-1.79-.62-.26 0-.75.07-1.15.32-.4.25-.72.7-.92 1.33l-1.91-.59c.38-1.25 1.05-2.25 2-2.84C9.47 3.09 10.48 3 11.43 3c1.61 0 2.82.36 3.96 1.46 1.01.97 1.61 2.02 1.61 3.54 0 .77-.09 1.39-.36 1.93-.27.54-.7 1.08-1.67 1.5z" />
      </svg>
    )
  },
  { 
    name: "Gemini",
    description: "Google的多模态模型，支持文本、图像理解",
    details: "Gemini是Google最新的多模态大语言模型，支持文本、代码、音频、图像和视频输入。具备先进的推理能力和多模态理解能力，在各种复杂任务中表现出色。",
    capabilities: ["多模态理解", "图像分析", "创意生成", "综合推理"],
    color: "bg-gradient-to-r from-red-500 to-orange-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 2.95L12 0l4 2.95L12 5.9z" />
        <path d="M12 5.9l4 2.95L12 11.8L8 8.85z" />
        <path d="M4 5.9L8 8.85l-4 2.95L0 8.85z" />
        <path d="M4 11.8l4 2.95-4 2.95L0 14.75z" />
        <path d="M16 11.8l4 2.95-4 2.95-4-2.95z" />
        <path d="M12 17.7l4 2.95-4 2.95-4-2.95z" />
      </svg>
    )
  },
  { 
    name: "Grok",
    description: "xAI开发的对话模型，幽默风趣",
    details: "Grok由xAI开发，以其幽默、个性化的对话风格著称。能够回答敏感问题，支持实时互联网搜索，保持对当前事件的了解，并在提供信息的同时增添幽默感。",
    capabilities: ["实时搜索", "幽默对话", "个性化回复", "知识更新"],
    color: "bg-gradient-to-r from-amber-500 to-yellow-500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    )
  }
]

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 自动轮播效果
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % aiModels.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 处理搜索框提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 触发showLogin事件，让LoginBox组件显示
    const showLoginEvent = new CustomEvent('showLogin');
    window.dispatchEvent(showLoginEvent);
  };

  return (
    <>
      {/* Hero标题部分 - 独占一行 */}
      <section className="pt-12 pb-6 md:pt-20 md:pb-10">
        <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-dark-blue">
            智能AI对话，<span className="text-navy-blue">随时随地</span>
          </h1>
          <p className="text-2xl font-semibold text-main-blue">
            高效稳定的ChatGPT镜像，国内畅用无阻！
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            体验全球领先AI模型，稳定快速的服务器确保流畅对话体验，为您提供智能问答解决方案。
          </p>
          
          {/* AI问答搜索框 */}
          <div className="relative max-w-2xl mx-auto mt-8">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="有任何问题？直接在这里提问..."
                  className="pl-4 pr-20 py-6 text-lg rounded-full border-2 border-navy-blue/30 focus-visible:ring-navy-blue shadow-md"
                />
                <Button 
                  type="submit"
                  className="absolute right-1.5 top-1.5 rounded-full bg-navy-blue hover:bg-dark-blue px-4 h-10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  提问
                </Button>
              </div>
            </form>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              立即体验AI对话，登录后享受更多功能
            </p>
          </div>
        </div>
      </section>
      
      {/* 模型与登录部分 */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-white to-baby-blue/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* 左侧：AI模型展示 */}
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-md p-6 border border-navy-blue/10 h-full flex flex-col">
                <h2 className="text-xl font-semibold mb-6 text-dark-blue flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="mr-2 text-main-blue"
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8"/>
                    <path d="M8 12h8"/>
                  </svg>
                  全球领先AI大模型集成平台
                </h2>
                
                {/* 模型轮播展示 */}
                <div className="flex-grow flex flex-col">
                  <Carousel className="w-full mb-6">
                    <CarouselContent>
                      {aiModels.map((model, i) => (
                        <CarouselItem key={i} className={i === activeIndex ? "block" : "hidden"}>
                          <div className={`p-6 rounded-xl ${model.color} text-white h-60 flex flex-col justify-between shadow-lg backdrop-blur-sm bg-opacity-95 transition-all duration-300 transform hover:scale-[1.01]`}>
                            <div>
                              <div className="flex items-center mb-4">
                                <div className="rounded-full bg-white/20 p-2.5 mr-3">
                                  {model.icon}
                                </div>
                                <h3 className="text-2xl font-bold flex items-center">
                                  {model.name}
                                  <span className="inline-flex ml-3 items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white/90">
                                    最新版本
                                  </span>
                                </h3>
                              </div>
                              <p className="text-white/90 text-base font-medium mb-2">{model.description}</p>
                              <p className="text-white/80 text-sm">{model.details}</p>
                            </div>
                            
                            <div className="mt-4 flex flex-wrap gap-2">
                              {model.capabilities.map((capability, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
                                  {capability}
                                </span>
                              ))}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                  
                  {/* 模型选择器 */}
                  <div className="mt-auto">
                    <div className="flex justify-center mb-4 space-x-2">
                      {aiModels.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                            i === activeIndex ? "bg-navy-blue w-8" : "bg-gray-300 hover:bg-gray-400"
                          }`}
                          aria-label={`切换到模型 ${i + 1}`}
                        />
                      ))}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-center">
                      {aiModels.map((model, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            i === activeIndex 
                              ? model.color + " text-white shadow-md" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                        >
                          <div className={i === activeIndex ? "" : "opacity-60"}>
                            {model.icon}
                          </div>
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      集成全球各大AI模型，一站式服务平台。国内服务器，畅享无限创意可能。
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右侧：登录/注册卡片 */}
            <div className="order-1 lg:order-2">
              <Card className="border-navy-blue/20 shadow-lg h-full">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-center text-navy-blue">AI对话体验</CardTitle>
                  <CardDescription className="text-center">登录账号获取完整AI对话功能</CardDescription>
                </CardHeader>
                
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">登录</TabsTrigger>
                    <TabsTrigger value="register">注册</TabsTrigger>
                  </TabsList>
                  
                  {/* 登录表单 */}
                  <TabsContent value="login">
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="#07C160"
                            className="h-5 w-5 mr-2"
                          >
                            <path d="M2.04651 9.86307C2.04651 5.15027 6.31158 1.33328 11.5512 1.33328C16.7908 1.33328 21.0558 5.15027 21.0558 9.86307C21.0558 14.5759 16.7908 18.3929 11.5512 18.3929C10.1926 18.3929 8.89627 18.1357 7.71069 17.6726L3.8935 19.2336C3.75032 19.2893 3.61285 19.2401 3.55714 19.0969C3.53998 19.0504 3.53646 18.9986 3.54698 18.95L4.26321 15.3897C2.87603 13.8832 2.04651 11.9634 2.04651 9.86307Z" />
                          </svg>
                          微信登录
                        </Button>
                        <Button variant="outline" className="w-full">
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="20" 
                            height="20" 
                            viewBox="0 0 1000 1000" 
                            className="h-5 w-5 mr-2"
                          >
                            <path 
                              d="M332.66,120.45c-44.07,13.53-85.3,32.54-123.08,55.52,19.28,15.18,38.96,30.82,58.6,46.26,45.01-26.88,95.77-45.32,148.38-53.56-26.7-16.23-53.8-31.94-83.9-48.22Z" 
                              fill="#1677FF"
                            />
                            <path 
                              d="M403.11,365.76c.24-61.52,54.79-111.43,120.77-111.43h5.61c66.58,0,120.53,49.91,120.77,111.43v50.73c46.41-.7,92.72-10.72,136.35-29.36,30.44-13.03,58.96-30.46,85.31-52.17V607.76c0,47.25-14.23,93-40.81,132.07-26.58,39.08-63.89,69.65-106.96,87.7-86.55,36.35-187.21,36.35-273.76,0-43.07-18.05-80.38-48.63-106.96-87.7-26.58-39.08-40.81-84.83-40.81-132.07V333.84c27.76,21.71,56.28,39.14,86.72,52.17,40.91,17.53,84.2,27.44,131.61,29.36v-49.6h-117.83ZM284.13,607.76c0,66.75,49.3,125.63,102.08,151.47,105.78,51.8,251.87,51.8,357.65,0,52.78-25.85,102.08-84.73,102.08-151.47v-201.57c-30.27,20.61-62.49,36.74-96.26,48.03-40.8,13.72-83.13,21.35-126.04,22.8-2.23,0-4.44,.19-6.63,.19h-4.21c-2.32,0-4.62-.19-6.94-.19-43.91-1.45-86.52-9.09-127.83-22.8-33.25-11.31-65.24-27.43-95.83-48.03v201.57h1.94Z" 
                              fill="#1677FF"
                            />
                          </svg>
                          手机登录
                        </Button>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-muted-foreground">或使用账号密码</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Input type="email" placeholder="邮箱地址或手机号" />
                        <Input type="password" placeholder="密码" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="remember" 
                              className="h-4 w-4 rounded border-gray-300 text-navy-blue focus:ring-navy-blue" 
                            />
                            <label htmlFor="remember" className="text-sm text-muted-foreground">
                              记住我
                            </label>
                          </div>
                          <a 
                            href="#" 
                            className="text-sm text-main-blue hover:underline"
                          >
                            忘记密码？
                          </a>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-navy-blue hover:bg-dark-blue">
                        登录账号
                      </Button>
                    </CardContent>
                  </TabsContent>
                  
                  {/* 注册表单 */}
                  <TabsContent value="register">
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Input type="text" placeholder="用户名" />
                        <Input type="email" placeholder="邮箱地址" />
                        <Input type="tel" placeholder="手机号码" />
                        <Input type="password" placeholder="设置密码" />
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="terms" 
                            className="h-4 w-4 rounded border-gray-300 text-navy-blue focus:ring-navy-blue" 
                          />
                          <label htmlFor="terms" className="text-sm text-muted-foreground">
                            我已阅读并同意
                            <a href="#" className="text-main-blue hover:underline"> 服务条款 </a>
                            和
                            <a href="#" className="text-main-blue hover:underline"> 隐私政策</a>
                          </label>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-navy-blue hover:bg-dark-blue">
                        创建账号
                      </Button>
                    </CardContent>
                  </TabsContent>
                </Tabs>
                
                <CardFooter className="flex flex-col space-y-2 pt-0">
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    免费用户每天可享受 <span className="font-semibold text-navy-blue">5条</span> AI对话额度
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  )
} 