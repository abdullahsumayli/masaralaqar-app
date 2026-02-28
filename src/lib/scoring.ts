export function calculateScore(message: string, lead: Record<string, unknown>): number {
  let score = (lead.score as number) || 0

  if (lead.budget || /مليون|ألف|ريال|بجت|ميزانية/i.test(message)) score += 20
  if (/موعد|معاينة|أشوف|أزور|زيارة/i.test(message)) score += 30
  if (/عاجل|اليوم|بأسرع|فوري|ضروري/i.test(message)) score += 20
  if (lead.property_type) score += 10
  if (lead.location) score += 10
  if (lead.name) score += 10

  return Math.min(score, 100)
}
