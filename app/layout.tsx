import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { AnnouncementProvider } from '@/components/AnnouncementProvider'

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
        <AnnouncementProvider>
          <Navbar />
          <main>{children}</main>
        </AnnouncementProvider>
      </body>
    </html>
  )
}
