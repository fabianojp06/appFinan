# Meu App Financeiro

Aplicativo mobile de controle financeiro pessoal com autenticação, dashboard de gastos e integração com Supabase. Desenvolvido em React Native (Expo) com interface moderna usando NativeWind.

## Funcionalidades

- **Autenticação** — Login e cadastro com Supabase Auth
- **Dashboard** — Visão geral do total de gastos e últimos lançamentos
- **Registro de gastos** — Cadastro de despesas com categorias e descrição
- **Alertas** — Tela preparada para notificações e insights (em desenvolvimento)
- **Perfil** — Gerenciamento da conta e sair da sessão
- **Pull-to-refresh** — Atualização dos dados na Home
- **Interface moderna** — Layout premium com NativeWind (Tailwind CSS)

## Tecnologias

- [Expo](https://expo.dev/) ~55
- [React Native](https://reactnative.dev/) 0.83
- [Supabase](https://supabase.com/) — Auth e banco de dados
- [NativeWind](https://www.nativewind.dev/) — Estilização com Tailwind
- [React Navigation](https://reactnavigation.org/) — Navegação por abas
- [Lucide React Native](https://lucide.dev/) — Ícones

## Pré-requisitos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- [Expo Go](https://expo.dev/go) no celular (para testar no dispositivo)
- Conta no [Supabase](https://supabase.com/) (para backend)

## Instalação

```bash
# Clone o repositório
git clone https://github.com/fabianojp06/appFinan.git
cd appFinan/meu-app-financeiro

# Instale as dependências
npm install

# Inicie o projeto
npm start
```

## Configuração

O app usa Supabase para autenticação e armazenamento. As credenciais estão configuradas em `src/services/supabase.js`.

Para usar seu próprio projeto Supabase:

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Configure as tabelas `transactions` e `categories` com as políticas RLS adequadas
3. Atualize `supabaseUrl` e `supabaseAnonKey` em `src/services/supabase.js`

> **Dica:** Em produção, use variáveis de ambiente (ex: `EXPO_PUBLIC_SUPABASE_URL`) em vez de valores fixos no código.

## Uso

1. Execute `npm start` e escaneie o QR Code com o Expo Go
2. Faça login ou crie uma conta
3. Na aba **Gastar**, registre despesas com valor, categoria e descrição
4. Na aba **Início**, visualize o total e os últimos lançamentos
5. Puxe a tela para baixo para atualizar os dados

## Estrutura do projeto

```
meu-app-financeiro/
├── App.js                 # Entrada e fluxo de autenticação
├── src/
│   ├── navigation/        # Navegação (tabs)
│   ├── screens/           # Telas do app
│   │   ├── HomeScreen.js
│   │   ├── AddTransactionScreen.js
│   │   ├── LoginScreen.js
│   │   ├── AlertsScreen.js
│   │   └── ProfileScreen.js
│   └── services/          # Supabase e outros serviços
├── assets/
└── package.json
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o Expo (desenvolvimento) |
| `npm run android` | Abre no emulador/dispositivo Android |
| `npm run ios` | Abre no simulador/dispositivo iOS |
| `npm run web` | Abre no navegador |

## Licença

Este projeto é de uso pessoal/educacional.
