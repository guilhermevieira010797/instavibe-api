export function welcomeVerificationTemplate(params: {
  name: string;
  code: string;
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const { name, code, expiresInMinutes } = params;
  return {
    subject: 'Bem-vindo ao InstaVibe — confirme seu e-mail',
    html: `
<!DOCTYPE html>
<html>
  <body>
    <h1>Olá, ${name}!</h1>
    <p>Seja bem-vindo ao InstaVibe. Para ativar sua conta, utilize o código abaixo:</p>
    <h2>${code}</h2>
    <p>Este código expira em ${expiresInMinutes} minutos.</p>
    <p>Se você não criou essa conta, ignore este e-mail.</p>
  </body>
</html>
`.trim(),
  };
}
