"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"

// AI模型数据
const aiModels = [
  { 
    name: "ChatGPT",
    description: "OpenAI强大的对话模型，处理各类语言任务",
    details: "支持GPT-3.5和GPT-4，具备强大的上下文理解能力和知识库。可处理代码、文案创作、语言翻译等多种任务，回答精确且自然。",
    capabilities: ["上下文理解", "代码编程", "多语言支持", "文本生成"],
    color: "bg-gradient-to-r from-emerald-500 to-teal-600",
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
    color: "bg-gradient-to-r from-indigo-500 to-purple-600",
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
    color: "bg-gradient-to-r from-blue-500 to-sky-600",
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
    color: "bg-gradient-to-r from-rose-500 to-orange-500",
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

// 生成随机验证码
const generateCaptcha = () => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let captcha = ''
  for (let i = 0; i < 4; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return captcha
}

// 生成随机颜色
const getRandomColor = () => {
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loginType, setLoginType] = useState('email');
  const [captchaText, setCaptchaText] = useState(generateCaptcha());
  const [captchaColor, setCaptchaColor] = useState(getRandomColor());
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 自动轮播效果 - 当用户手动选择后暂停一段时间再继续
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % aiModels.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  // 切换到指定模型
  const handleModelSelect = (index: number) => {
    setActiveIndex(index);
  };

  // 处理倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setEmailVerificationSent(false)
    }
  }, [countdown])

  // 刷新验证码
  const refreshCaptcha = () => {
    setCaptchaText(generateCaptcha())
    setCaptchaColor(getRandomColor())
  }

  // 发送验证码
  const handleSendVerificationCode = () => {
    // TODO: 实现发送验证码的逻辑
    setEmailVerificationSent(true)
    setCountdown(60) // 60秒倒计时
  }

  // 处理搜索框提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 滚动到登录区域
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };
  
  return (
    <div className="bg-white relative overflow-hidden">
      {/* 背景装饰 */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
      
      <div className="absolute top-0 left-0 right-0 h-[80vh] overflow-hidden -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 to-transparent z-0"></div>
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Hero标题部分 */}
      <section className="relative pt-12 pb-8 md:pt-24 md:pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center space-y-6 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-7xl font-bold leading-tight bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                智能AI对话，随时随地<span className="relative inline-block">

                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-xl md:text-2xl font-semibold text-gray-700">
                高效稳定的AI大模型聚合平台，国内畅用无阻！
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
                体验全球领先AI模型，稳定快速的服务器确保流畅对话体验，为您提供智能问答解决方案。
              </p>
            </motion.div>
            
            {/* AI问答搜索框 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative max-w-2xl mx-auto mt-10"
            >
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder="有任何问题？直接在这里提问..."
                    className="pl-5 pr-24 py-7 text-lg rounded-full border-0 bg-white shadow-xl focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                  />
                  <Button 
                    type="submit"
                    className="absolute right-1.5 top-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 h-12 font-medium shadow-md transition-all"
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
              <p className="mt-4 text-sm text-gray-500 text-center">
                立即体验AI对话，<a href="#auth-section" className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">登录后</a>享受更多高级功能
              </p>
            </motion.div>
          </div>
          
          {/* 特点卡片 */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
                  <path d="M21 3v9h-9" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">无缝稳定接入</h3>
              <p className="text-gray-600">国内服务器部署，稳定快速，无需科学上网，畅享AI对话体验</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                  <path d="M21 8v-.67a2 2 0 0 0-2-2h-7" />
                  <path d="M3 12h10" />
                  <path d="M12 16H3" />
                  <path d="m15 16 3 3 3-3" />
                  <path d="M18 3v16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">多模型聚合</h3>
              <p className="text-gray-600">集成多种主流大语言模型，一站式体验ChatGPT、Claude等最新AI技术</p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                  <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">安全隐私保障</h3>
              <p className="text-gray-600">严格的数据加密和隐私保护机制，确保您的对话内容安全可靠</p>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* 模型与登录部分 */}
      <section className="py-12 md:py-16 relative" id="auth-section">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white -z-10"></div>
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            {/* 左侧：AI模型展示 */}
            <div className="order-2 lg:order-1">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 h-full flex flex-col"
              >
                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
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
                    className="mr-2 text-indigo-600"
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8"/>
                    <path d="M8 12h8"/>
                  </svg>
                  全球领先AI大模型集成平台
                </h2>
                
                {/* 模型轮播展示 */}
                <div className="flex-grow flex flex-col">
                  <div className="relative mb-6">
                    <div className="w-full overflow-hidden">
                      {aiModels.map((model, i) => (
                        <div 
                          key={i} 
                          className={`p-6 rounded-xl ${model.color} text-white h-64 shadow-lg backdrop-blur-sm bg-opacity-95 transition-all duration-500 ${
                            i === activeIndex ? "block" : "hidden"
                          }`}
                        >
                          <div className="flex flex-col justify-between h-full">
                            <div>
                              <div className="flex items-center mb-4">
                                <div className="rounded-full bg-white/20 p-2.5 mr-3 backdrop-blur-sm">
                                  {model.icon}
                                </div>
                                <h3 className="text-2xl font-bold flex items-center">
                                  {model.name}
                                  <span className="inline-flex ml-3 items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                                    最新版本
                                  </span>
                                </h3>
                              </div>
                              <p className="text-white/90 text-base font-medium mb-2">{model.description}</p>
                              <p className="text-white/80 text-sm">{model.details}</p>
                            </div>
                            
                            <div className="mt-4 flex flex-wrap gap-2">
                              {model.capabilities.map((capability, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                                  {capability}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 统一的模型选择器 */}
                  <div className="mt-auto">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {aiModels.map((model, i) => (
                        <button
                          key={i}
                          onClick={() => handleModelSelect(i)}
                          className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                            i === activeIndex 
                              ? model.color + " text-white shadow-md" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <div className={i === activeIndex ? "" : "opacity-70"}>
                            {model.icon}
                          </div>
                          <span className="ml-1.5">{model.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center">
                        <div className="rounded-full bg-indigo-100 p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/>
                            <path d="M12 16v-4"/>
                            <path d="M12 8h.01"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">全球顶尖AI模型聚合平台</p>
                          <p className="text-sm text-gray-500">国内服务器部署，稳定高效，体验无限AI创意</p>
                        </div>
                      </div>
                      {/* <Button className="w-full sm:w-auto rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                        了解更多模型详情
                      </Button> */}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* 右侧：登录/注册卡片 */}
            <div className="order-1 lg:order-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <Card className="border-0 shadow-2xl overflow-hidden bg-white rounded-2xl">
                  {/* <CardHeader className="space-y-1 pb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100">
                    <CardTitle className="text-2xl font-bold text-center text-gray-800">AI对话体验</CardTitle>
                    <CardDescription className="text-center text-gray-600">登录账号获取完整AI对话功能</CardDescription>
                  </CardHeader>
                   */}
                  <Tabs defaultValue="login" className="w-full">
                    <div className="px-6 py-4">
                      <TabsList className="grid w-full grid-cols-2 overflow-hidden p-1 h-14 rounded-xl bg-gray-100 border border-gray-200 shadow-md">
                        <TabsTrigger 
                          value="login" 
                          className="rounded-lg py-3 text-base font-medium flex items-center justify-center leading-normal data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                          </svg>
                          <span>登录账号</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="register" 
                          className="rounded-lg py-3 text-base font-medium flex items-center justify-center leading-normal data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 transition-all duration-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                          </svg>
                          <span>注册账号</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    {/* 登录表单 */}
                    <TabsContent value="login" className="mt-0 px-6 pb-6 border-0 outline-0 shadow-none">
                      <div className="flex flex-col space-y-5">
                        {/* 登录方式切换 */}
                        <div className="p-1 rounded-xl flex border border-gray-200 shadow-sm bg-gray-50">
                          <button
                            type="button"
                            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                              loginType === 'email' 
                                ? 'bg-white text-indigo-600 font-semibold shadow-sm' 
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            onClick={() => setLoginType('email')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <rect width="20" height="16" x="2" y="4" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            <span>邮箱登录</span>
                          </button>
                          <button
                            type="button"
                            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                              loginType === 'authCode' 
                                ? 'bg-white text-indigo-600 font-semibold shadow-sm' 
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            onClick={() => setLoginType('authCode')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>授权码登录</span>
                          </button>
                        </div>

                        {loginType === 'email' ? (
                          <div className="space-y-4">
                            <div className="flex flex-col space-y-1.5">
                              <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">邮箱地址</Label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                  </svg>
                                </div>
                                <Input 
                                  id="login-email" 
                                  placeholder="请输入邮箱地址" 
                                  className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                                />
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1.5">
                              <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">密码</Label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>
                                <Input 
                                  id="login-password" 
                                  type="password" 
                                  placeholder="请输入密码" 
                                  className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  id="remember" 
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <label htmlFor="remember" className="text-sm text-gray-600">
                                  记住我
                                </label>
                              </div>
                              <a 
                                href="#" 
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors"
                              >
                                忘记密码？
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex flex-col space-y-1.5">
                              <Label htmlFor="auth-code" className="text-sm font-medium text-gray-700">授权码</Label>
                              <div className="relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>
                                <Input 
                                  id="auth-code" 
                                  placeholder="请输入授权码" 
                                  className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                                />
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                              <p className="text-sm text-blue-800 flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5 text-blue-500">
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4" />
                                  <path d="M12 8h.01" />
                                </svg>
                                请输入您之前获得的授权码进行登录
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 h-12 text-base font-medium tracking-wide transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] rounded-xl">
                          {loginType === 'email' ? '登录账号' : '验证授权码'}
                        </Button>
                        
                        <div className="relative flex items-center justify-center mt-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                          </div>
                          <div className="relative px-4 bg-white text-sm text-gray-500">即将支持更多第三方账号登录</div>
                        </div>
                        
                        {/* <div className="flex space-x-3 justify-center">
                          <button className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow transition-all">
                            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"></path>
                            </svg>
                          </button>
                          <button className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow transition-all">
                            <svg className="w-5 h-5 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723 10.054 10.054 0 0 1-3.127 1.184 4.92 4.92 0 0 0-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 0 0-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 0 1-2.228-.616v.06a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.212.085 4.936 4.936 0 0 0 4.604 3.417 9.867 9.867 0 0 1-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0 0 7.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0 0 24 4.59z" />
                            </svg>
                          </button>
                          <button className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow transition-all">
                            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.01 14.92c-1.07 1.16-2.37 1.84-3.99 2.03-.51.06-1.01.06-1.52.01-.53-.06-1.03-.18-1.5-.37-.47-.2-.88-.44-1.24-.74-.35-.29-.66-.64-.92-1.02l-.05-.06c-.25-.35-.45-.72-.6-1.12s-.25-.81-.31-1.26c-.05-.4-.06-.79-.03-1.19.04-.51.13-.99.28-1.44.15-.45.35-.87.59-1.26.25-.38.55-.71.89-.99s.73-.5 1.17-.67c.44-.17.9-.27 1.38-.3.49-.04.97-.01 1.45.08.91.17 1.73.57 2.48 1.22.75.65 1.31 1.45 1.68 2.39.37.95.47 1.95.3 2.99-.17 1.04-.56 1.97-1.16 2.8zm-7.36-3.95c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm4.5 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z" />
                            </svg>
                          </button>
                          <button className="flex items-center justify-center w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow transition-all">
                            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8.686 4.181c1.03-1.442 3.082-2.331 5.28-2.331 1.627 0 3.22.527 4.413 1.414.679.504 1.216 1.128 1.59 1.872-1.283.6-2.145 1.87-2.145 3.33a3.81 3.81 0 0 0 1.252 2.834c.27.267.577.494.914.667-.091.313-.203.63-.337.952-.308.743-.707 1.459-1.195 2.142-1.033 1.295-2.066 1.818-3.244 1.818-.804 0-1.352-.19-1.864-.37-.526-.186-1.028-.362-1.947-.362-.897 0-1.443.122-1.633.239-.488.115-1.212.224-1.866.224z" />
                            </svg>
                          </button>
                        </div> */}
                      </div>
                    </TabsContent>
                    
                    {/* 注册表单 */}
                    <TabsContent value="register" className="mt-0 px-6 pb-6 border-0 outline-0 shadow-none">
                      <div className="flex flex-col space-y-5">
                        <div className="space-y-4">
                          {/* 邮箱地址 */}
                          <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="register-email" className="text-sm font-medium text-gray-700">邮箱地址</Label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="20" height="16" x="2" y="4" rx="2" />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                              </div>
                              <Input 
                                id="register-email" 
                                placeholder="请输入邮箱地址" 
                                className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                              />
                            </div>
                          </div>
                          
                          {/* 验证码 */}
                          <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="verification-code" className="text-sm font-medium text-gray-700">邮箱验证码</Label>
                            <div className="flex space-x-3">
                              <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                </div>
                                <Input 
                                  id="verification-code" 
                                  placeholder="请输入验证码" 
                                  className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={handleSendVerificationCode}
                                disabled={emailVerificationSent}
                                className="w-32 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md disabled:opacity-70 disabled:hover:bg-indigo-600"
                              >
                                {emailVerificationSent ? `${countdown}秒后重发` : '发送验证码'}
                              </Button>
                            </div>
                          </div>
                          
                          {/* 密码 */}
                          <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="register-password" className="text-sm font-medium text-gray-700">设置密码</Label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              </div>
                              <Input 
                                id="register-password" 
                                type="password" 
                                placeholder="请设置您的密码" 
                                className="h-12 pl-10 pr-4 border border-gray-200 group-focus-within:border-indigo-400 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all" 
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-2">
                            <input 
                              type="checkbox" 
                              id="agree-terms" 
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                            />
                            <label htmlFor="agree-terms" className="text-sm text-gray-600">
                              我已阅读并同意<a href="#" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors">《用户协议》</a>和<a href="#" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline transition-colors">《隐私政策》</a>
                            </label>
                          </div>
                        </div>
                        
                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 h-12 text-base font-medium tracking-wide transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] rounded-xl">
                          注册账号
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* 底部装饰波浪 */}
      <div className="w-full overflow-hidden">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
          <path fill="#f1f5f9" fillOpacity="0.8" d="M0,128L48,144C96,160,192,192,288,186.7C384,181,480,139,576,122.7C672,107,768,117,864,149.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  )
} 