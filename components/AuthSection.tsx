"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AuthSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-md mx-auto">
        <Card className="border-navy-blue/20 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-navy-blue">AI对话体验</CardTitle>
            <CardDescription className="text-center">登录账号获取更多会话额度和高级功能</CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            
            {/* 登录表单 */}
            <TabsContent value="login">
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
            <div className="w-full flex justify-between items-center bg-gray-50 p-2 rounded text-xs text-muted-foreground">
              <span>付费套餐:</span>
              <span className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-baby-blue/20 rounded text-navy-blue font-medium">标准版 ¥29/月</span>
                <span className="px-2 py-1 bg-baby-blue/20 rounded text-navy-blue font-medium">高级版 ¥69/月</span>
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
} 