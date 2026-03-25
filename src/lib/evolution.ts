const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

interface EvolutionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

async function evolutionFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<EvolutionResponse<T>> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, error: 'Evolution API not configured' }
  }

  const url = `${EVOLUTION_API_URL}${path}`

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
        ...options.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[Evolution] ${res.status} ${path}:`, text)
      return { ok: false, error: `${res.status}: ${text}` }
    }

    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    console.error(`[Evolution] Network error ${path}:`, err)
    return { ok: false, error: 'Network error' }
  }
}

export async function createInstance(instanceName: string, webhookUrl: string) {
  return evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    }),
  })
}

export async function getQRCode(instanceName: string) {
  return evolutionFetch<{ base64?: string; code?: string }>(
    `/instance/connect/${instanceName}`,
    { method: 'GET' }
  )
}

export async function getConnectionState(instanceName: string) {
  return evolutionFetch<{ instance?: { state?: string } }>(
    `/instance/connectionState/${instanceName}`,
    { method: 'GET' }
  )
}

export async function sendText(
  instanceName: string,
  phone: string,
  text: string
) {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      text,
    }),
  })
}

export async function deleteInstance(instanceName: string) {
  return evolutionFetch(`/instance/delete/${instanceName}`, {
    method: 'DELETE',
  })
}

export async function setWebhook(instanceName: string, webhookUrl: string) {
  return evolutionFetch(`/webhook/set/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: true,
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
      ],
    }),
  })
}

export async function fetchInstances() {
  return evolutionFetch<Array<{ instance: { instanceName: string; state: string } }>>(
    '/instance/fetchInstances',
    { method: 'GET' }
  )
}
