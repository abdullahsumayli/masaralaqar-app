import OpenAI from 'openai'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export interface AIAnalysis {
  name: string | null
  budget: number | null
  property_type: 'villa' | 'apartment' | 'land' | 'commercial' | 'rent' | null
  location: string | null
  intent: 'buy' | 'rent' | 'invest' | 'inquiry'
  urgency: 'high' | 'medium' | 'low'
}

export async function analyzeMessage(text: string): Promise<Partial<AIAnalysis>> {
  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `أنت محلل رسائل عقارية متخصص في السوق السعودي.
استخرج من الرسالة التالية المعلومات بصيغة JSON فقط:
{
  "name": "اسم العميل أو null",
  "budget": "الميزانية بالأرقام (ريال) أو null",
  "property_type": "villa/apartment/land/commercial/rent أو null",
  "location": "المنطقة أو الحي المطلوب أو null",
  "intent": "buy/rent/invest/inquiry",
  "urgency": "high/medium/low"
}
فهم اللهجة السعودية: أبي = أريد، ودي = أريد، شقة = apartment، فيلا = villa، أرض = land.`
        },
        { role: 'user', content: text }
      ]
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    console.error('[AI] analyzeMessage failed:', error)
    return {}
  }
}

interface GenerateReplyParams {
  agentConfig: Record<string, unknown>
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  leadInfo: Record<string, unknown>
  properties: Array<Record<string, unknown>>
}

export async function generateReply(params: GenerateReplyParams): Promise<string | null> {
  const { agentConfig, message, history, leadInfo, properties } = params

  try {
    const openai = getOpenAI()

    const agentName = (agentConfig.name as string) || 'صقر'
    const welcomeMsg = (agentConfig.welcome_message as string) || ''
    const officeDesc = (agentConfig.office_description as string) || ''
    const tone = (agentConfig.tone as string) || 'formal_friendly'
    const customInstructions = (agentConfig.custom_instructions as string) || ''

    const toneMap: Record<string, string> = {
      formal_friendly: 'رسمي وودود، استخدم "حياك الله" و"يسعدني خدمتك"',
      casual: 'عامي سعودي مهذب',
      formal: 'رسمي بالكامل',
    }

    const propertiesSummary = properties
      .slice(0, 10)
      .map((p) => {
        const parts = [p.title, p.type, p.city, p.district, p.location]
          .filter(Boolean)
          .join(' - ')
        const price = p.price ? `${Number(p.price).toLocaleString('ar-SA')} ريال` : ''
        const beds = p.bedrooms ? `${p.bedrooms} غرف` : ''
        const area = p.area ? `${p.area} م²` : ''
        return `• ${parts} | ${[price, beds, area].filter(Boolean).join(' | ')}`
      })
      .join('\n')

    const systemPrompt = `أنت ${agentName}، مساعد عقاري ذكي تابع لمكتب عقاري سعودي.
${officeDesc ? `وصف المكتب: ${officeDesc}` : ''}

النبرة: ${toneMap[tone] || toneMap.formal_friendly}

مهامك:
1. الترحيب بالعميل وفهم احتياجه العقاري
2. اقتراح عقارات مناسبة من القائمة المتاحة
3. جمع معلومات العميل (الاسم، الميزانية، نوع العقار، المنطقة)
4. ترتيب معاينة أو تحويل للوسيط المختص

قواعد صارمة:
- لا تخترع عقارات غير موجودة في القائمة
- إذا ما لقيت عقار مناسب، قل إنك راح تبحث وترجع له
- لا تذكر أنك بوت أو AI، تصرف كمساعد بشري
- الردود مختصرة ومباشرة (3 أسطر كحد أقصى)
- استخدم اللهجة السعودية في الرد
${customInstructions ? `\nتعليمات إضافية: ${customInstructions}` : ''}
${welcomeMsg && history.length <= 1 ? `\nرسالة الترحيب: ${welcomeMsg}` : ''}

معلومات العميل الحالي:
- الاسم: ${leadInfo.name || 'غير معروف'}
- الميزانية: ${leadInfo.budget ? `${Number(leadInfo.budget).toLocaleString('ar-SA')} ريال` : 'غير محددة'}
- نوع العقار: ${leadInfo.property_type || 'غير محدد'}
- المنطقة: ${leadInfo.location || 'غير محددة'}

العقارات المتاحة:
${propertiesSummary || 'لا توجد عقارات متاحة حالياً'}`

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: message },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    })

    return response.choices[0].message.content || null
  } catch (error) {
    console.error('[AI] generateReply failed:', error)
    return null
  }
}
