const negativeWords = ['angry', 'cancel', 'broken', 'refund', 'late', 'complaint', 'urgent', 'bad', 'issue', 'failed'];
const positiveWords = ['thanks', 'great', 'love', 'happy', 'excellent', 'appreciate', 'renew'];
const criticalWords = ['urgent', 'asap', 'immediately'];

export function classifyEmail(text) {
  const body = `${text}`.toLowerCase();

  const sentiment =
    positiveWords.some((word) => body.includes(word)) && !negativeWords.some((word) => body.includes(word))
      ? 'positive'
      : negativeWords.some((word) => body.includes(word))
        ? 'negative'
        : 'neutral';

  const urgency = criticalWords.some((word) => body.includes(word))
    ? 'critical'
    : negativeWords.some((word) => body.includes(word))
      ? 'high'
      : 'medium';

  const intent =
    body.includes('meeting') || body.includes('schedule')
      ? 'schedule_meeting'
      : body.includes('invoice') || body.includes('payment')
        ? 'invoice_request'
        : body.includes('support') || body.includes('issue') || body.includes('broken')
          ? 'support_request'
          : body.includes('quote') || body.includes('demo') || body.includes('buy')
            ? 'sales_opportunity'
            : 'general_inquiry';

  return {
    sentiment,
    urgency,
    intent,
    confidence: 0.8,
    autoResponse: intent === 'support_request' ? 'We are reviewing your issue and will follow up shortly.' : 'Thanks for reaching out to NxtBiz.',
    recommendations: ['Review customer history', 'Create follow-up task'],
  };
}
