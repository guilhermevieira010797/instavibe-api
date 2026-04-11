export function passwordResetTemplate(params: {
  name: string;
  code: string;
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const { name, code, expiresInMinutes } = params;
  return {
    subject: 'InstaVibe — recuperação de senha',
    html: `
<!DOCTYPE html>
<html>
  <body>
    <h1>Olá, ${name}!</h1>
    <p>Recebemos uma solicitação para redefinir sua senha. Use o código abaixo na tela de recuperação:</p>
    <h2>${code}</h2>
    <p>Este código expira em ${expiresInMinutes} minutos.</p>
    <p>Se você não solicitou isso, ignore este e-mail.</p>
  </body>
</html>
`.trim(),
  };
}
