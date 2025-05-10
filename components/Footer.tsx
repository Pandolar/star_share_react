import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export function Footer() {
  return (
    <footer className="bg-navy-blue text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
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
                className="text-baby-blue"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12h-3a1 1 0 0 1-1-1V8" />
                <path d="M10 16a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0v1z" />
                <path d="M14 16a2 2 0 0 0 4 0v-1a2 2 0 0 0-4 0v1z" />
              </svg>
              <h3 className="text-xl font-bold">AI中国</h3>
            </div>
            <p className="text-baby-blue/80 mb-4">
              高效稳定的ChatGPT镜像，国内畅用无阻！多种AI大模型，一站体验，不再受限于网络环境。
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-baby-blue">
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
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="hover:text-baby-blue">
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
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 0 1 1.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.42 25.42 0 0 0-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.814 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.688 8.688 0 0 1 12 3.475zm-3.633.803a53.889 53.889 0 0 1 3.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 0 1 4.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.523 8.523 0 0 1-2.191-5.705zM12 20.547a8.482 8.482 0 0 1-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.32 35.32 0 0 1 1.823 6.475 8.402 8.402 0 0 1-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 0 1-3.655 5.715z" />
                </svg>
              </a>
              <a href="#" className="hover:text-baby-blue">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 1024 1024"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">AI模型</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/models/chatgpt" className="hover:text-baby-blue transition-colors">
                  ChatGPT (3.5/4.0)
                </Link>
              </li>
              <li>
                <Link href="/models/claude" className="hover:text-baby-blue transition-colors">
                  Claude
                </Link>
              </li>
              <li>
                <Link href="/models/deepseek" className="hover:text-baby-blue transition-colors">
                  Deepseek
                </Link>
              </li>
              <li>
                <Link href="/models/gemini" className="hover:text-baby-blue transition-colors">
                  Gemini
                </Link>
              </li>
              <li>
                <Link href="/models/grok" className="hover:text-baby-blue transition-colors">
                  Grok
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">用户中心</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="hover:text-baby-blue transition-colors">
                  套餐价格
                </Link>
              </li>
              <li>
                <Link href="/usage" className="hover:text-baby-blue transition-colors">
                  使用教程
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-baby-blue transition-colors">
                  常见问题
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-baby-blue transition-colors">
                  服务状态
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="hover:text-baby-blue transition-colors">
                  意见反馈
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">联系与支付</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
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
                  className="h-5 w-5 mr-2 text-baby-blue"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>400-888-8888</span>
              </li>
              <li className="flex items-center">
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
                  className="h-5 w-5 mr-2 text-baby-blue"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>support@aichina.com</span>
              </li>
              <li className="mt-4">
                <p className="mb-2 text-sm">支持支付方式：</p>
                <div className="flex space-x-2">
                  <div className="bg-white/10 h-8 w-12 rounded flex items-center justify-center text-xs">
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#07C160">
                      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm243.7 349.7c-28.6 4.2-95.4 16.8-158.7 48.9 9.9 33.6 18.1 71.2 18.1 113.1 0 124.3-88.5 237.9-252.9 237.9S107.6 700 107.6 575.7c0-75.3 39.6-139.6 104.8-186.5C275.3 348.6 365 343.7 471 343.7c-12.3-36-15-70.7-4.9-102.2-155.7 0-281.9 111.8-281.9 248.8 0 137.6 142.9 248.9 318.9 248.9s318.9-111.3 318.9-248.9c.1-83.2-46.4-156.9-117.5-199.2-2.5 92.2-35.8 174.6-101.5 244.1-16.7 17.7-37.7 38.3-62.9 59-48.4 40.1-99.5 71.7-126.8 71.7-22.6 0-31.9-20.3-31.9-20.3-3.5-9.1-4.8-18.9-3.9-28.8 1.3-14.2 9.1-29.5 9.1-29.5 26.2-56.1 81.8-142.1 81.8-142.1L548 468s-70.2 77.5-107 132.8c0 0-11.8 18.2-15.8 34.4-1.7 6.9-1.7 14.1.1 21 5.2 21 23.7 51.2 74.6 51.2 70.3 0 134.6-43.4 188.2-88.1 42.2-35.1 84.4-82.5 115.5-136.2 20.4-35.2 36.1-75.1 39-116.9z" />
                    </svg>
                  </div>
                  <div className="bg-white/10 h-8 w-12 rounded flex items-center justify-center text-xs">
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#1677FF">
                      <path d="M232 536.2c12.5-29.4 40.6-95.2 40.6-95.2L309 493s2.7 7.5 4.3 12.3c6.5 17.8 1.6 30.9-15 30.9h-61c-1.4 0-2.3-.1-3.3-.8-.8-.5-1.2-1.4-1.2-2.2 0-1.3.3-3.8 2.7-8.2zm124.5-33c-.3-1.6-1.9-2.8-4.2-2.8h-.3c-.5.1-15.1 2-25.3 3.4-5.3.7-8.5 6-8.5 11v.6l4.5 85.9c.1 2.6 2.3 4.6 4.9 4.6h25.3c2.6 0 4.8-2 4.9-4.6L363 510.4c0-.6-.1-1.2-.2-1.8-.1-.4-.2-.9-.3-1.4zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm166.6 512.8c-55.7 62.8-137.1 99-214.5 99s-158.9-36.3-214.5-99c-8.1-9.2-21-9.8-29.8-1.4-8.9 8.5-9.4 22.5-1.3 31.7 64.9 73.2 158.4 116.8 245.6 116.8s180.7-43.5 245.6-116.8c8.1-9.2 7.6-23.1-1.3-31.7-8.7-8.4-21.6-7.7-29.8 1.4zm-214.5 35.3c-26.5 0-47.9-21.5-47.9-48s21.5-48 47.9-48 47.9 21.5 47.9 48-21.4 48-47.9 48zm-251.3-38.6c-77.7-55.6-89.5-158.5-89.5-158.5-.5-33.3 19.3-52.6 46.6-63.7 32.2-13 64.1-6.9 78.2.3 17.8 9.3 32.8 23.3 42.4 40.6 16.3 29.5 19.6 64.3 9.2 95.4-22.7 67.3-78.7 93.4-86.9 85.9zM668 588c-33.3 26.5-75.8 31.1-105.2 14-16.5-9.6-41.6-32.7-35.3-76.3 6.2-43.7 44.2-68.1 79.3-72.6 35.1-4.5 73.6 10.7 91.9 22.6 26.8 17.4 47.2 53.6 14.5 102.4l5.8 7.2c56.6-46.2 68.1-148.9 38.8-201.6-28.7-51.9-90.6-70.2-143.7-68.5-94.5 2.9-196.2 94.4-195.9 199.4-.1 9.7.7 19.4 2.4 28.9.5 2.4 1.1 4.7 1.7 7 1.8 7.1 7.5 22.1 8.2 24.1 26.2 65.2 86.7 108.6 155.9 113.5 80.7 5.7 151.6-33.4 188.5-98.1-15.5 9.4-39.6 17.6-52.4 17.6-12.8 0-28.7-8.4-55.5-27.2zm-168.7-10.1c-93.5-51.1-62.6-157-62.6-157 21.3-84.1 87.5-77.1 105.1-75.8 32.7 2.5 62.4 17.8 81.6 43 19.2 25.1 25 56.7 16.2 87.6-8.8 30.9-32.6 54.5-63.2 62.9-46.3 12.9-77.1 39.3-77.1 39.3z" />
                    </svg>
                  </div>
                  <div className="bg-white/10 h-8 w-12 rounded flex items-center justify-center text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 1024 1024" fill="#1677FF">
                      <path d="M308.23 723.57h-90.46V527.03h90.46v196.54zm294.81-196.54H366.69v196.54h203.76c54.4 0 98.77-44.37 98.77-98.77v-30.17c-.02-37.17-30.21-67.6-66.18-67.6zm-136.36 84.34c-18.34 0-33.36-15.02-33.36-33.36 0-18.34 15.02-33.36 33.36-33.36 18.34 0 33.36 15.02 33.36 33.36 0 18.34-15.02 33.36-33.36 33.36zm307.07-84.34h-91.6v196.54h91.6c54.4 0 98.77-44.37 98.77-98.77v-30.17c-.01-37.17-30.2-67.6-98.77-67.6zm-32.48 84.34c-18.34 0-33.36-15.02-33.36-33.36 0-18.34 15.02-33.36 33.36-33.36 18.34 0 33.36 15.02 33.36 33.36 0 18.34-15.02 33.36-33.36 33.36zm-125.73-196.54H217.77v67.6h397.77v-67.6zM857.9 301.69v-67.6H166.1v67.6H857.9z" />
                    </svg>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <Separator className="bg-white/10" />
      
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-white/70">
            &copy; {new Date().getFullYear()} AI中国 - ChatGPT镜像站. 保留所有权利.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="/terms" className="text-xs text-white/70 hover:text-baby-blue">
              服务条款
            </Link>
            <Link href="/privacy" className="text-xs text-white/70 hover:text-baby-blue">
              隐私政策
            </Link>
            <Link href="/disclaimer" className="text-xs text-white/70 hover:text-baby-blue">
              免责声明
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 