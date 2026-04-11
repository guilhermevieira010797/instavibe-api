export function welcomeTemplate(params: {
  name: string;
}): { subject: string; html: string } {
  const { name } = params;
  return {
    subject: 'Bem-vindo ao InstaVibe',
    html: `
<!DOCTYPE html>
<html>
  <body>
    <h1>Olá, ${name}!</h1>
    <p>Sua conta InstaVibe foi criada com sucesso.</p>
    <p>Aproveite para criar conteúdo incrível para o seu Instagram.</p>
  </body>
</html>
`.trim(),
  };
}
