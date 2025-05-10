"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function LoginBox() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState("login")

  useEffect(() => {
    // 监听导航栏中登录/注册按钮的点击事件
    const handleShowLogin = () => {
      setIsVisible(true)
    }

    window.addEventListener('showLogin', handleShowLogin)

    // 清理事件监听器
    return () => {
      window.removeEventListener('showLogin', handleShowLogin)
    }
  }, [])

  // 处理问题按钮点击事件
  const handleAskClick = () => {
    // 此处可以添加检查用户是否已登录的逻辑
    // 如果未登录，就显示登录框
    setIsVisible(true)
  }

  // 关闭登录框
  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          className="bg-main-blue hover:bg-dark-blue rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
          onClick={handleAskClick}
          aria-label="提问"
        >
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
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{activeTab === "login" ? "登录" : "注册"}</CardTitle>
            <button 
              onClick={handleClose} 
              className="text-gray-500 hover:text-gray-800"
              aria-label="关闭"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <CardDescription>
            {activeTab === "login" ? "欢迎回来！请登录您的账号" : "创建一个新账号开始使用AI服务"}
          </CardDescription>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <CardContent className="pt-4">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input id="login-email" placeholder="请输入邮箱地址" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="login-password">密码</Label>
                    <Input id="login-password" type="password" placeholder="请输入密码" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="login-remember" 
                        className="h-4 w-4 rounded border-gray-300 text-navy-blue focus:ring-navy-blue" 
                      />
                      <label htmlFor="login-remember" className="text-sm text-muted-foreground">
                        记住我
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button className="w-full bg-navy-blue hover:bg-dark-blue">登录</Button>
              <div className="text-sm text-center">
                <a href="#" className="text-main-blue hover:underline">忘记密码?</a>
              </div>
            </CardFooter>
          </TabsContent>
          <TabsContent value="register">
            <CardContent className="pt-4">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="register-name">用户名</Label>
                    <Input id="register-name" placeholder="请输入用户名" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="register-email">邮箱</Label>
                    <Input id="register-email" placeholder="请输入邮箱地址" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="register-password">密码</Label>
                    <Input id="register-password" type="password" placeholder="请设置密码" />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="register-confirm">确认密码</Label>
                    <Input id="register-confirm" type="password" placeholder="请再次输入密码" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="register-terms" 
                      className="h-4 w-4 rounded border-gray-300 text-navy-blue focus:ring-navy-blue" 
                    />
                    <label htmlFor="register-terms" className="text-sm text-muted-foreground">
                      我已阅读并同意
                      <a href="#" className="text-main-blue hover:underline"> 服务条款 </a>
                      和
                      <a href="#" className="text-main-blue hover:underline"> 隐私政策</a>
                    </label>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-navy-blue hover:bg-dark-blue">注册</Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
} 