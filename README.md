# 🚀 F/Design Solutions — Sistema Final

**Autor:** Vinicius Sabino  
**Localização:** Newark, NJ  
**Data:** Outubro 2025  
**Versão:** 2.0.0 (Final Build)

---

## 📋 SOBRE O SISTEMA

Sistema completo de gerenciamento de vendas e orçamentos para **F/Design Solutions**, desenvolvido com **Google Apps Script** e integrado ao **Google Sheets**.

### 🛠️ Tecnologias Utilizadas
- **Backend:** Google Apps Script (Apps Script)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Banco de Dados:** Google Sheets (abas estruturadas)
- **Gráficos:** Google Charts API
- **Autenticação:** Sessões baseadas em PropertiesService

---

## 📁 ESTRUTURA DO PROJETO

```
FDesignSystem_FinalBuild/
├── .clasp.json              # Configuração CLASP
├── appsscript.json          # Manifesto do projeto
├── Código.js                # Backend principal (Apps Script)
├── loginSistema.html        # Tela de login
├── homeFDesign.html         # Dashboard principal
├── painelAdmin.html         # Painel administrativo
├── formVendas.html          # Formulário de vendas
├── formGerenciar.html       # Gerenciamento de registros
├── dashboardVendas.html     # Dashboard detalhado de vendas
└── README.md               # Este arquivo
```

---

## 🔧 INSTALAÇÃO E CONFIGURAÇÃO

### Pré-requisitos
- Conta Google Workspace
- Google Sheets habilitado
- CLASP instalado globalmente (`npm install -g @google/clasp`)

### Passos de Instalação

1. **Clonar/Configurar o Projeto:**
   ```bash
   # Configurar CLASP
   clasp login
   clasp create "FDesignSystem" --type sheets
   ```

2. **Copiar Arquivos:**
   - Substitua o `scriptId` no `.clasp.json` pelo ID do seu projeto Apps Script
   - Faça upload de todos os arquivos HTML para o projeto

3. **Configurar Google Sheets:**
   - Crie uma nova planilha
   - Adicione as seguintes abas (sheets):
     - `USUARIOS` - Gestão de usuários
     - `Client_List` - Registro de vendas
     - `ORCAMENTOS` - Controle de orçamentos
     - `CONFIG` - Configurações do sistema
     - `AUDITORIA` - Log de ações

4. **Executar Setup Inicial:**
   ```javascript
   // Execute no Apps Script Editor:
   setupInicial();
   ```

---

## 👥 GESTÃO DE USUÁRIOS

### Tipos de Usuário
- **Admin:** Acesso completo ao sistema
- **Vendedor:** Acesso a vendas e orçamentos
- **Funcionário:** Acesso limitado ao dashboard
- **Afiliado:** Acesso restrito

### Primeiro Login
1. Execute `setupInicial()` no Apps Script
2. Adicione usuários na aba `USUARIOS`
3. Faça login com email + PIN

---

## 📊 FUNCIONALIDADES

### 🔐 Autenticação
- Login manual (email + PIN)
- Login automático (Google Account)
- Sessões seguras com expiração
- Controle de permissões por tipo

### 💰 Gestão de Vendas
- Registro de vendas (New/Old/Walk-in)
- Cálculo automático de comissões
- Busca e edição de registros
- Relatórios em PDF

### 📋 Controle de Orçamentos
- Criação e acompanhamento
- Status: Aberto/Proposta Enviada/Fechado/Perdido
- Taxa de conversão automática

### 📈 Dashboards
- Dashboard principal (visão geral)
- Dashboard de vendas (análises detalhadas)
- Painel administrativo (gestão completa)
- Gráficos interativos (Google Charts)

### 👑 Painel Administrativo
- Gestão completa de usuários
- Relatórios consolidados
- Configurações do sistema
- Auditoria de ações

---

## 🔗 ENDPOINTS PRINCIPAIS

### Autenticação
- `verificarLogin(credenciais)` - Login manual
- `loginAutomatico()` - Login automático
- `encerrarSessao()` - Logout

### Vendas
- `registrarVenda(dados)` - Nova venda
- `buscarVenda(invoice)` - Buscar venda
- `atualizarVenda(dados)` - Editar venda
- `excluirVenda(linha)` - Excluir venda

### Dashboards
- `obterDadosDashboard()` - Dados principais
- `obterDadosAdmin()` - Dados administrativos

### Usuários (Admin)
- `obterUsuarios()` - Listar usuários
- `salvarUsuario(user)` - Criar/editar usuário
- `excluirUsuario(id)` - Excluir usuário

---

## 🎨 DESIGN E UX

### Identidade Visual
- **Cores:** Azul (#2b5797) e Amarelo (#fbbc04)
- **Fonte:** Inter (Google Fonts)
- **Logo:** F/Design Solutions oficial
- **Layout:** Responsivo e moderno

### Navegação
- Menu lateral no painel admin
- Botões de ação intuitivos
- Feedback visual em todas as ações
- Loading states e mensagens de erro

---

## 🔒 SEGURANÇA

### Medidas Implementadas
- ✅ Sessões com expiração automática
- ✅ Validação de permissões por endpoint
- ✅ Sanitização de dados de entrada
- ✅ Logs de auditoria completos
- ✅ Proteção contra acesso não autorizado

### Boas Práticas
- Nunca exponha chaves ou senhas no código
- Use HTTPS em produção
- Mantenha backups regulares
- Monitore logs de auditoria

---

## 🚀 DEPLOYMENT

### Usando CLASP
```bash
# Fazer login
clasp login

# Push para produção
clasp push

# Abrir no navegador
clasp open
```

### Configuração de Produção
1. Configure o `scriptId` correto
2. Execute `setupInicial()` uma vez
3. Teste todas as funcionalidades
4. Configure permissões de compartilhamento

---

## 🐛 DEBUGGING

### Logs Importantes
- Verifique `Logger.log()` no Apps Script Editor
- Monitore a aba `AUDITORIA` para ações
- Use o console do navegador (F12) para erros frontend

### Problemas Comuns
- **Sessão expirada:** Faça login novamente
- **Permissões insuficientes:** Verifique tipo de usuário
- **Dados não carregam:** Verifique conexão e abas do Sheets

---

## 📞 SUPORTE

**Desenvolvido por:** Vinicius Sabino  
**Empresa:** F/Design Solutions  
**Localização:** Newark, NJ  

Para suporte técnico ou dúvidas:
- Verifique os logs de erro
- Teste em modo incógnito
- Reinicie o Apps Script se necessário

---

## 📝 CHANGELOG

### Versão 2.0.0 (Final Build)
- ✅ Sistema completamente refatorado
- ✅ Login e sessão otimizados
- ✅ Interface responsiva e moderna
- ✅ Branding F/Design Solutions
- ✅ Documentação completa
- ✅ Setup automatizado

---

## 🎯 PRÓXIMOS PASSOS

- [ ] Configurar domínio personalizado
- [ ] Implementar notificações por email
- [ ] Adicionar backup automático
- [ ] Criar API REST para integrações
- [ ] Desenvolver app mobile companion

---

**© 2025 F/Design Solutions — Newark, NJ**  
*Sistema desenvolvido com ❤️ para impulsionar vendas e eficiência*
