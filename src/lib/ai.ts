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
