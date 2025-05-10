"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  // 处理登录/注册按钮点击事件
  const handleAuthClick = () => {
    // 使用自定义事件通知其他组件显示登录框
    const showLoginEvent = new CustomEvent('showLogin');
    window.dispatchEvent(showLoginEvent);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-main-blue"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12h-3a1 1 0 0 1-1-1V8" />
                <path d="M10 16a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0v1z" />
                <path d="M14 16a2 2 0 0 0 4 0v-1a2 2 0 0 0-4 0v1z" />
              </svg>
              <span className="text-2xl font-bold text-navy-blue">AI中国</span>
            </div>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/models" 
            className="text-sm font-medium hover:text-main-blue transition-colors"
          >
            支持模型
          </Link>
          <Link 
            href="/pricing" 
            className="text-sm font-medium hover:text-main-blue transition-colors"
          >
            价格套餐
          </Link>
          <Link 
            href="/usage" 
            className="text-sm font-medium hover:text-main-blue transition-colors"
          >
            使用教程
          </Link>
          <Link 
            href="/faq" 
            className="text-sm font-medium hover:text-main-blue transition-colors"
          >
            常见问题
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="border-navy-blue text-navy-blue hover:bg-navy-blue hover:text-white"
              onClick={handleAuthClick}
            >
              登录
            </Button>
            <Button 
              className="bg-navy-blue hover:bg-dark-blue"
              onClick={handleAuthClick}
            >
              注册
            </Button>
          </div>
        </nav>
        
        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
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
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 mt-8">
              <Link 
                href="/models" 
                className="text-sm font-medium hover:text-main-blue transition-colors"
                onClick={() => setIsOpen(false)}
              >
                支持模型
              </Link>
              <Link 
                href="/pricing" 
                className="text-sm font-medium hover:text-main-blue transition-colors"
                onClick={() => setIsOpen(false)}
              >
                价格套餐
              </Link>
              <Link 
                href="/usage" 
                className="text-sm font-medium hover:text-main-blue transition-colors"
                onClick={() => setIsOpen(false)}
              >
                使用教程
              </Link>
              <Link 
                href="/faq" 
                className="text-sm font-medium hover:text-main-blue transition-colors"
                onClick={() => setIsOpen(false)}
              >
                常见问题
              </Link>
              <Button 
                variant="outline" 
                className="border-navy-blue text-navy-blue hover:bg-navy-blue hover:text-white" 
                onClick={() => {
                  setIsOpen(false);
                  handleAuthClick();
                }}
              >
                登录
              </Button>
              <Button 
                className="bg-navy-blue hover:bg-dark-blue" 
                onClick={() => {
                  setIsOpen(false);
                  handleAuthClick();
                }}
              >
                注册
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
} 