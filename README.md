# Werika Mendonça Closet — Catálogo

Catálogo online (moda feminina, Pontalina - GO) com painel para a loja cadastrar peças,
fotos, preços e montar a tela inicial. Pedidos e condicional vão pelo WhatsApp.

- **Catálogo:** `https://werika-closet.vercel.app`
- **Painel da loja:** `https://werika-closet.vercel.app/#admin` (link direto, não aparece no catálogo)

Site estático (HTML, CSS e JS puro), sem build. Dados no Supabase.

## Estrutura
```
index.html          telas (catálogo, peça, sacola, login, painel)
css/style.css       visual
js/config.js        URL e chave do Supabase + e-mail de login da loja
js/app.js           lógica do catálogo e do painel
img/                ícone e imagem de compartilhamento
supabase/setup.sql  tabelas, segurança e bucket de fotos
```

## Configurar o Supabase (uma vez)
1. **SQL Editor** → cole todo o `supabase/setup.sql` → **Run**.
2. **Authentication → Users → Add user → Create new user**: e-mail e senha da Werika,
   marque **Auto Confirm User**.
3. **Authentication → Sign In / Providers**: desligue **Allow new users to sign up**
   (só a loja pode ter login).
4. **Project Settings → API**: copie **Project URL** e a chave **anon public** para `js/config.js`,
   junto com o e-mail criado no passo 2.

## Publicar na Vercel
Importe o repositório no Vercel (Add New → Project), **Framework Preset: Other**, sem build
command e sem output directory. Cada `git push` publica de novo sozinho.

## Rodar no computador
Qualquer servidor estático na pasta, por exemplo: `npx serve .`
