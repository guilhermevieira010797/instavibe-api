# Configuração da API Meta / Instagram

Este guia explica como configurar as variáveis de ambiente relacionadas à integração com o Instagram Graph API.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `META_GRAPH_API_VERSION` | Sim | Versão da API (padrão: `v25.0`) |
| `META_SYSTEM_IG_USER_ID` | Para discovery | ID da conta Instagram Business do sistema |
| `META_SYSTEM_ACCESS_TOKEN` | Para discovery | Token de acesso da Página do Facebook vinculada |

### Para que cada uma é usada

| Funcionalidade | Variáveis necessárias |
|---|---|
| Importar perfil pelo `@username` (discovery) | `META_SYSTEM_IG_USER_ID` + `META_SYSTEM_ACCESS_TOKEN` |
| Publicar post no Instagram do usuário | Token próprio do usuário (obtido via OAuth — fluxo do frontend) |
| Versão da API | `META_GRAPH_API_VERSION` (ambos os casos) |

> A publicação usa o `instagramAccessToken` individual de cada usuário, salvo no perfil. As variáveis de sistema só são necessárias para o fluxo de descoberta por username.

---

## Passo a passo

### 1. Criar um App Meta

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Vá em **Meus apps → Criar app**
3. Tipo: **Business**
4. Preencha nome e e-mail de contato
5. Clique em **Criar app**

---

### 2. Adicionar o produto Instagram

1. No painel do app, clique em **Adicionar produto**
2. Encontre **Instagram** e clique em **Configurar**
3. O menu lateral passará a exibir as opções de configuração do Instagram

---

### 3. Vincular uma Página do Facebook com conta Instagram Business

A API do Instagram Graph exige que a conta usada pelo sistema seja uma conta **Business ou Creator** vinculada a uma **Página do Facebook**.

**Transformar em conta profissional (se necessário):**
- No Instagram: Configurações → Conta → Mudar para conta profissional

**Vincular ao Facebook:**
- Na Página do Facebook: Configurações → Instagram → Conectar conta

**Adicionar sua conta como testador (ambiente de desenvolvimento):**
- No painel do app: Instagram → Configurações da API → Usuários de teste → Adicionar

---

### 4. Obter o `META_SYSTEM_IG_USER_ID`

Este é o **Instagram User ID** da conta Business que o sistema usará para fazer chamadas de descoberta.

**Via Explorador da API Graph** ([developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)):

1. Selecione seu app e gere um token com as permissões:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement`
2. Liste suas Páginas:
   ```
   GET /me/accounts
   ```
3. Use o `id` da Página retornada para buscar a conta Instagram vinculada:
   ```
   GET /{PAGE_ID}?fields=instagram_business_account
   ```
4. O `id` dentro de `instagram_business_account` é o seu `META_SYSTEM_IG_USER_ID`

**Via cURL:**
```bash
# 1. Listar páginas
curl "https://graph.facebook.com/v25.0/me/accounts?access_token=SEU_TOKEN"

# 2. Buscar conta Instagram vinculada à página
curl "https://graph.facebook.com/v25.0/{PAGE_ID}?fields=instagram_business_account&access_token=SEU_TOKEN"
```

---

### 5. Gerar o `META_SYSTEM_ACCESS_TOKEN`

Este token precisa ter **longa duração** para não expirar. Siga o fluxo abaixo:

**5.1 — Token de usuário no Explorador**

Gere um token com as permissões:
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

**5.2 — Trocar por token de longa duração (60 dias)**

```bash
curl "https://graph.facebook.com/v25.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=SEU_APP_ID\
&client_secret=SEU_APP_SECRET\
&fb_exchange_token=TOKEN_CURTO_DO_EXPLORADOR"
```

O `SEU_APP_ID` e `SEU_APP_SECRET` estão em **Configurações do app → Básico** no painel da Meta.

**5.3 — Obter o token de Página (não expira)**

```bash
curl "https://graph.facebook.com/v25.0/me/accounts?access_token=TOKEN_LONG_LIVED"
```

O campo `access_token` de cada Página nessa resposta **não expira**. Use esse valor como `META_SYSTEM_ACCESS_TOKEN`.

---

### 6. Preencher o `.env`

```env
META_GRAPH_API_VERSION=v25.0
META_SYSTEM_IG_USER_ID=123456789012345
META_SYSTEM_ACCESS_TOKEN=EAAxxxxx...
```

---

## Permissões necessárias no app

| Permissão | Para quê |
|---|---|
| `instagram_basic` | Leitura de dados básicos da conta |
| `instagram_content_publish` | Publicação de posts no Instagram |
| `pages_show_list` | Listar Páginas do Facebook do usuário |
| `pages_read_engagement` | Ler dados da Página vinculada |
| `business_management` | Business Discovery (busca de perfis por username) |

---

## Observações para produção

- **Revisão de permissões:** Para usar `instagram_content_publish` e `business_management` em contas fora do seu app, é necessário passar pela revisão de permissões da Meta
- **Testes locais:** Em desenvolvimento, adicione as contas como **Testers** no painel do app para contornar a revisão
- **Token sem expiração:** Considere usar um **System User do Business Manager** (`business.facebook.com → Configurações → Usuários do sistema`) para gerar um token que nunca expira — mais robusto do que o token de Página para ambientes de produção

---

## Referências

- [Instagram Graph API — Visão geral](https://developers.facebook.com/docs/instagram-api)
- [Business Discovery API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/business_discovery)
- [Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Explorador da API Graph](https://developers.facebook.com/tools/explorer)
