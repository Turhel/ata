# ATA Portal — Backup e Restore

## Objetivo

Este documento define a estratégia oficial de **backup e recuperação** do **ATA Portal**.

Ele serve para:

- proteger dados operacionais e financeiros
- permitir restauração rápida em caso de falha
- padronizar o processo de backup
- reduzir perda de dados
- facilitar migração para outra máquina

> Regra principal:
> backup que nunca foi testado é só esperança com nome bonito.

---

# Escopo do backup

## O que deve ser salvo

O sistema deve fazer backup de:

- banco de dados PostgreSQL
- arquivos de configuração do projeto
- arquivos `.env` necessários
- scripts de infraestrutura
- volumes persistentes relevantes
- logs críticos, se necessário
- futuros arquivos de upload, caso esse módulo exista

---

## O que **não** precisa entrar no backup principal

Normalmente não é necessário salvar:

- `node_modules`
- cache de build
- artefatos temporários
- containers recriáveis
- imagens Docker públicas
- frontend hospedado na Vercel
- código já versionado no Git

---

# Componentes críticos

## 1. PostgreSQL

É o backup mais importante do sistema.

Contém:

- usuários
- roles
- team assignments
- inspetores
- contas de inspetor
- clientes
- tipos de trabalho
- ordens
- eventos
- notas
- lotes de importação
- lotes de pagamento

---

## 2. Better Auth

O Better Auth roda dentro da API e persiste no PostgreSQL do sistema, então o backup do banco já cobre o auth.

Se estiver usando:

- outro banco
- outro schema
- outro volume dedicado

então esse armazenamento também deve entrar no backup.

---

## 3. Arquivos de ambiente

Devem ser salvos com cuidado:

- `.env`
- `.env.production`
- `.env.local`, se necessário
- arquivos secretos fora do Git

> Esses arquivos não devem ir para repositório público.

---

## 4. Scripts e infraestrutura

Salvar:

- `infra/docker/`
- `infra/scripts/`
- `infra/caddy/`
- configurações específicas do servidor

---

# Objetivos operacionais

## RPO — Recovery Point Objective

Perda máxima aceitável de dados:

**até 24 horas**, no mínimo.

### Ideal futuro

- backup diário completo
- backup adicional antes de operações críticas
- possibilidade de backup mais frequente se o sistema crescer

---

## RTO — Recovery Time Objective

Tempo desejado para restaurar o sistema em nova máquina:

**até 30-60 minutos** para operação básica.

---

# Estratégia de backup

## Estratégia oficial inicial

### 1. Backup lógico do PostgreSQL

Ferramenta principal:

```bash
pg_dump
```

---



### Formato recomendado

Preferir  **custom format** :

<pre class="overflow-visible! px-0!" data-start="2716" data-end="2739"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>pg_dump </span><span class="ͼu">-Fc</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Motivo

Permite:

* compressão
* restore seletivo
* maior flexibilidade com `pg_restore`

---

## 2. Backup dos arquivos de ambiente e infraestrutura

Salvar separadamente:

* arquivos `.env`
* Caddyfile
* Docker Compose
* scripts de backup/restore
* qualquer configuração local fora do Git

---

## 3. Backup externo

Os backups não devem ficar **somente** na mesma máquina do servidor.

Salvar também em pelo menos um destes destinos:

* HD externo
* outro computador
* armazenamento criptografado
* serviço de backup remoto confiável

> Backup guardado só no mesmo notebook é quase um suicídio administrativo. Prático, mas péssima ideia.

---

# Frequência de backup

## Obrigatório

### Diário

* backup do PostgreSQL 1x por dia

### Antes de mudanças críticas

Executar backup manual antes de:

* migration estrutural
* alteração financeira relevante
* grande importação de pool
* upgrade de infraestrutura
* troca de máquina
* restore de teste destrutivo

---

## Recomendado futuramente

### Semanal

* cópia externa consolidada dos últimos backups
* validação rápida da integridade dos arquivos

### Mensal

* teste completo de restauração em ambiente separado

---

# Convenção de nomes

## Diretório sugerido

<pre class="overflow-visible! px-0!" data-start="3958" data-end="3990"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>/backups/ata-portal/</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Estrutura sugerida

<pre class="overflow-visible! px-0!" data-start="4015" data-end="4088"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>/backups/ata-portal/</span><br/><span>  postgres/</span><br/><span>  env/</span><br/><span>  infra/</span><br/><span>  manifests/</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Nome de arquivo do banco

Formato recomendado:

<pre class="overflow-visible! px-0!" data-start="4146" data-end="4215"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>ata-portal-postgres-{ambiente}-{yyyy-mm-dd_HH-mm-ss}.dump</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Exemplo

<pre class="overflow-visible! px-0!" data-start="4229" data-end="4296"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>ata-portal-postgres-production-2026-03-10_22-30-00.dump</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## Nome de arquivo compactado de configs

<pre class="overflow-visible! px-0!" data-start="4345" data-end="4414"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>ata-portal-config-{ambiente}-{yyyy-mm-dd_HH-mm-ss}.tar.gz</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

# Retenção de backups

## Política inicial sugerida

Manter:

* últimos **7 backups diários**
* últimos **4 backups semanais**
* últimos **3 backups mensais**

### Regra

Nunca apagar backup automaticamente sem garantir que existem backups mais recentes e válidos.

---

# Conteúdo mínimo de cada backup

## Backup diário padrão

Deve incluir:

### Banco

* dump do PostgreSQL

### Configuração

* `.env` relevante
* `docker-compose`
* Caddyfile
* scripts de infra

### Metadados

* data/hora
* nome da máquina
* ambiente
* versão atual do sistema, se possível
* checksum do arquivo

---

# Checksum e integridade

## Regra

Todo backup gerado deve registrar hash do arquivo.

### Exemplo

<pre class="overflow-visible! px-0!" data-start="5105" data-end="5161"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>sha256sum arquivo.dump > arquivo.dump.sha256</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Motivo

Permite validar:

* corrupção de arquivo
* transferência incompleta
* alteração indevida

---

# Script de backup sugerido

## Local sugerido

<pre class="overflow-visible! px-0!" data-start="5316" data-end="5360"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>infra/scripts/backup-postgres.sh</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

## Responsabilidades do script

* gerar dump
* salvar com nome padronizado
* gerar checksum
* registrar log de sucesso ou falha
* opcionalmente compactar configs relacionadas

---

## Exemplo conceitual de dump

<pre class="overflow-visible! px-0!" data-start="5573" data-end="5755"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>pg_dump \</span><br/><span></span><span class="ͼu">-h</span><span> localhost \</span><br/><span></span><span class="ͼu">-p</span><span></span><span class="ͼq">5432</span><span> \</span><br/><span></span><span class="ͼu">-U</span><span> postgres \</span><br/><span></span><span class="ͼu">-d</span><span> ata_portal \</span><br/><span></span><span class="ͼu">-Fc</span><span> \</span><br/><span></span><span class="ͼu">-f</span><span> /backups/ata-portal/postgres/ata-portal-postgres-production-2026-03-10_22-30-00.dump</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

> Os nomes reais de banco, host e usuário devem vir do `.env`.

---

# Restore

## Objetivo do restore

Permitir recuperação rápida em caso de:

* corrupção de banco
* erro humano
* falha de disco
* troca de máquina
* desastre operacional

---

# Pré-requisitos para restore

Antes de restaurar, garantir:

* Docker instalado
* repositório clonado
* `.env` correto disponível
* serviços básicos configurados
* PostgreSQL acessível
* arquivo de backup íntegro
* checksum validado

---

# Ordem oficial de restauração

## 1. Preparar a máquina

Instalar:

* Docker
* Docker Compose / plugin compose
* Git
* utilitários de restore

---

## 2. Clonar o repositório

<pre class="overflow-visible! px-0!" data-start="6417" data-end="6452"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span class="ͼs">git</span><span> clone <repositorio></span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## 3. Restaurar arquivos de configuração

Recuperar:

* `.env`
* `docker-compose`
* configs do proxy
* scripts necessários

---

## 4. Subir a infraestrutura base

Subir os serviços necessários para restauração:

* postgres
* api, se necessário depois

Exemplo conceitual:

<pre class="overflow-visible! px-0!" data-start="6746" data-end="6826"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>docker compose </span><span class="ͼu">-f</span><span> infra/docker/docker-compose.dev.yml up </span><span class="ͼu">-d</span><span> postgres</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

ou o compose de produção, conforme o caso.

---

## 5. Criar banco alvo, se necessário

Se o banco não existir, criar antes do restore.

---

## 6. Restaurar dump do PostgreSQL

Ferramenta principal:

<pre class="overflow-visible! px-0!" data-start="7029" data-end="7051"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>pg_restore</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

### Exemplo conceitual

<pre class="overflow-visible! px-0!" data-start="7076" data-end="7293"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>pg_restore \</span><br/><span></span><span class="ͼu">-h</span><span> localhost \</span><br/><span></span><span class="ͼu">-p</span><span></span><span class="ͼq">5432</span><span> \</span><br/><span></span><span class="ͼu">-U</span><span> postgres \</span><br/><span></span><span class="ͼu">-d</span><span> ata_portal \</span><br/><span></span><span class="ͼu">--clean</span><span> \</span><br/><span></span><span class="ͼu">--if-exists</span><span> \</span><br/><span></span><span class="ͼu">--no-owner</span><span> \</span><br/><span>  /backups/ata-portal/postgres/ata-portal-postgres-production-2026-03-10_22-30-00.dump</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

## 7. Subir os demais serviços

Após o restore:

* api
* demais serviços necessários

---

## 8. Validar a restauração

Verificar:

* login funcionando
* endpoint `/health`
* contagem básica de usuários
* contagem básica de ordens
* imports recentes
* lotes de pagamento
* dashboards básicos carregando

---

# Restore completo em máquina nova

## Checklist resumido

### Infra

* [ ] instalar Docker
* [ ] instalar Git
* [ ] clonar repositório
* [ ] restaurar `.env`
* [ ] revisar portas e DNS
* [ ] subir PostgreSQL

### Banco

* [ ] validar arquivo `.dump`
* [ ] validar checksum
* [ ] criar banco
* [ ] executar `pg_restore`

### Aplicação

* [ ] configurar Better Auth na API
* [ ] subir API
* [ ] validar `/health`
* [ ] validar login
* [ ] validar dados críticos

### Pós-restore

* [ ] revisar logs
* [ ] revisar acesso admin
* [ ] revisar imports recentes
* [ ] revisar lote financeiro mais recente

---

# Restore parcial

## Quando usar

Em situações específicas, pode ser necessário restaurar apenas:

* banco de homologação
* ambiente local para testes
* dados de auditoria
* tabelas selecionadas

## Regra

Restore parcial nunca deve ser feito diretamente em produção sem plano explícito.

---

# Backup antes de ações perigosas

## Obrigatório antes de:

* migrations destrutivas
* alterações em massa
* importação de arquivos muito grandes
* scripts administrativos de correção
* recalcular pagamentos históricos
* mudança de estrutura de auth
* upgrade major do PostgreSQL

---

# Política de testes de restore

## Regra

Backup sem teste periódico de restore não é confiável.

## Frequência recomendada

* teste simples: mensal
* teste completo em máquina separada: trimestral

## O que validar no teste

* arquivo abre normalmente
* `pg_restore` conclui sem erro crítico
* API sobe
* login funciona
* contagens principais batem
* dados financeiros recentes existem

---

# Logs de backup

## Recomendação

Cada execução de backup deve gerar log com:

* data/hora
* arquivo gerado
* tamanho do arquivo
* checksum
* duração
* status final
* mensagem de erro, se falhar

## Local sugerido

<pre class="overflow-visible! px-0!" data-start="9397" data-end="9434"><div class="relative w-full mt-4 mb-1"><div class=""><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute inset-x-4 top-12 bottom-4"><div class="pointer-events-none sticky z-40 shrink-0 z-1!"><div class="sticky bg-token-border-light"></div></div></div><div class=""><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼk ͼy"><div class="cm-scroller"><div class="cm-content q9tKkq_readonly"><span>/backups/ata-portal/logs/</span></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></pre>

---

# Política de segurança

## 1. Acesso restrito

Apenas usuários administrativos autorizados devem acessar:

* dumps do banco
* arquivos `.env`
* arquivos de configuração sensíveis

---

## 2. Criptografia

Sempre que possível, os backups externos devem estar:

* criptografados
* protegidos por senha
* armazenados fora da máquina principal

---

## 3. Dados financeiros e pessoais

Como o sistema contém:

* nomes
* emails
* dados operacionais
* futuramente chave PIX e dados financeiros

os backups devem ser tratados como  **dados sensíveis** .

---

# Regra de exclusão de backup

## Antes de apagar backup antigo, garantir:

* existência de backup mais novo válido
* integridade verificada
* retenção mínima respeitada

---

# Cenários de desastre cobertos

Este plano deve cobrir pelo menos:

* SSD corrompido
* sistema operacional quebrado
* erro humano em migration
* exclusão acidental de dados
* troca total de máquina
* rollback para backup recente

---

# Procedimento de emergência

## Se a produção falhar

### 1. Parar alterações destrutivas

* não rodar novos scripts
* não tentar “consertar no desespero”

### 2. Identificar a falha

* banco
* configuração
* aplicação
* máquina

### 3. Decidir estratégia

* corrigir sem restore
* restore parcial
* restore completo

### 4. Validar último backup íntegro

### 5. Restaurar em ordem

* infra base
* banco
* api (inclui auth)

### 6. Validar saúde do sistema

* `/health`
* login
* ordens
* pagamentos

---

# Futuras melhorias

No futuro, considerar:

* backup automatizado com retenção controlada
* cópia remota automática
* backup criptografado com ferramenta dedicada
* `pg_basebackup` ou PITR, se o sistema crescer
* alertas automáticos em caso de falha de backup

---

# Conclusão

A estratégia oficial do ATA Portal é:

* **backup diário do PostgreSQL**
* **backup dos arquivos de configuração críticos**
* **armazenamento externo adicional**
* **restore documentado e testado**
* **validação periódica**

Se o sistema puder ser recriado com:

* repositório
* `.env`
* dump do banco
* compose
* restore

então a arquitetura está saudável.
