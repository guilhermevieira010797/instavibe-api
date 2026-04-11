export function subscriptionExpirationTemplate(params: {
  name: string;
  plan: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const { name, plan, expiresAt } = params;
  const formatted = expiresAt.toISOString().slice(0, 10);
  return {
    subject: 'Sua assinatura anual InstaVibe está próxima do vencimento',
    html: `
<!DOCTYPE html>
<html>
  <body>
    <h1>Olá, ${name}!</h1>
    <p>Sua assinatura <strong>${plan}</strong> está próxima do vencimento: <strong>${formatted}</strong>.</p>
    <p>Para manter acesso sem interrupções, basta refazer a contratação após o vencimento.</p>
  </body>
</html>
`.trim(),
  };
}
