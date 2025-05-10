import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl md:text-4xl font-bold text-dark-blue mb-4">为什么选择我们的镜像服务</h2>
        <p className="text-muted-foreground text-lg">
          我们提供高质量、高可用性的ChatGPT和多种AI大模型国内镜像服务，让您畅享AI智能对话体验
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <Card key={index} className="border-navy-blue/10 hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-baby-blue/20 mb-3">
                {feature.icon}
              </div>
              <CardTitle className="text-navy-blue">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center">
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
                      className="h-5 w-5 mr-2 text-main-blue"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ChatGPT镜像网站特色
const features = [
  {
    title: "国内稳定访问",
    description: "无需科学上网，直接访问全球领先AI大模型",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    benefits: [
      "国内多节点部署，就近访问",
      "高速CDN加速，极致体验",
      "99.9%服务可用性保障",
      "无需任何代理工具"
    ]
  },
  {
    title: "多模型集成",
    description: "一站式体验多种顶级AI大模型，满足不同需求",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <path d="M12 3c.3 0 .5 0 .8.1A9 9 0 0 1 20.9 11c0 .3.1.5.1.8v.2a9 9 0 0 1-9 9h-.2c-.3 0-.5 0-.8-.1A9 9 0 0 1 3.1 13c0-.3-.1-.5-.1-.8v-.2a9 9 0 0 1 9-9h.2Z" />
        <path d="m12 7 3 3" />
        <path d="M15 10h-3V7" />
        <path d="m12 17-3-3" />
        <path d="M9 14h3v3" />
      </svg>
    ),
    benefits: [
      "ChatGPT (3.5和4.0版本)",
      "Claude (Opus和Sonnet)",
      "Deepseek高级版",
      "Gemini Pro和Ultra",
      "Grok最新版本"
    ]
  },
  {
    title: "完整AI功能",
    description: "完整保留原版功能，无缝对接原生体验",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    benefits: [
      "支持文本、代码、表格生成",
      "支持GPT插件使用",
      "支持图像理解与分析",
      "历史对话保存与管理"
    ]
  },
  {
    title: "隐私安全保障",
    description: "使用过程中的数据安全与隐私保护",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    benefits: [
      "全程加密传输，保障数据安全",
      "不存储用户敏感对话内容",
      "遵循严格隐私政策",
      "合规运营，安全可靠"
    ]
  },
  {
    title: "灵活支付方式",
    description: "多种支付选择，满足国内用户需求",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
    benefits: [
      "支持支付宝、微信支付",
      "按量计费或包月订阅可选",
      "无需绑定国外信用卡",
      "简单便捷的充值流程"
    ]
  },
  {
    title: "专业客服支持",
    description: "专业的技术团队提供全方位支持",
    icon: (
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
        className="h-6 w-6 text-navy-blue"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    benefits: [
      "7×24小时在线客服",
      "专业技术支持团队",
      "详细的使用教程",
      "活跃的用户社区"
    ]
  }
] 