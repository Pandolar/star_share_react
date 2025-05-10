import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
// LoginBox is rendered conditionally in HeroSection, no need to add it here

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI智能问答系统',
  description: '使用先进的AI技术为您解答问题',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
        {/* LoginBox moved to HeroSection with event-based rendering */}
      </body>
    </html>
  )
}
