<p align="center">
  <a href="https://kaneo.app">
    <img src="https://assets.kaneo.app/logo-text.png" alt="Kaneo's logo" width="450" />
  </a>
</p>

<div align="center">

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/usekaneo/kaneo/ci.yml?branch=main)](https://github.com/usekaneo/kaneo/actions)
[![AI Policy: Human Voice](https://img.shields.io/badge/AI_Policy-Human_Voice-blue?logo=data:image%2Fsvg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij4KICA8c3R5bGU%2BCiAgICAuaWNvbiB7CiAgICAgIGZpbGw6IG5vbmU7CiAgICAgIHN0cm9rZTogIzAwMDAwMDsKICAgICAgc3Ryb2tlLXdpZHRoOiAyLjI1OwogICAgICBzdHJva2UtbGluZWNhcDogcm91bmQ7CiAgICAgIHN0cm9rZS1saW5lam9pbjogcm91bmQ7CiAgICB9CiAgICBAbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7CiAgICAgIC5pY29uIHsgc3Ryb2tlOiAjZmZmZmZmOyB9CiAgICB9CiAgPC9zdHlsZT4KICA8cGF0aCBjbGFzcz0iaWNvbiIgZD0iTTE5LjQxNCAxNC40MTRDMjEgMTIuODI4IDIyIDExLjUgMjIgOS41YTUuNSA1LjUgMCAwIDAtOS41OTEtMy42NzYuNi42IDAgMCAxLS44MTguMDAxQTUuNSA1LjUgMCAwIDAgMiA5LjVjMCAyLjMgMS41IDQgMyA1LjVsNS41MzUgNS4zNjJhMiAyIDAgMCAwIDIuODc5LjA1MiAyLjEyIDIuMTIgMCAwIDAtLjAwNC0zIDIuMTI0IDIuMTI0IDAgMSAwIDMtMyAyLjEyNCAyLjEyNCAwIDAgMCAzLjAwNCAwIDIgMiAwIDAgMCAwLTIuODI4bC0xLjg4MS0xLjg4MmEyLjQxIDIuNDEgMCAwIDAtMy40MDkgMGwtMS43MSAxLjcxYTIgMiAwIDAgMS0yLjgyOCAwIDIgMiAwIDAgMSAwLTIuODI4bDIuODIzLTIuNzYyIi8%2BCjwvc3ZnPgo%3D)](https://github.com/usekaneo/kaneo/blob/main/AI_POLICY.md)
[![Discord](https://img.shields.io/discord/1326250681530843178?color=7389D8&label=&logo=discord&logoColor=ffffff)](https://discord.gg/rU4tSyhXXU)
[![Sponsors](https://img.shields.io/github/sponsors/andrejsshell)](https://github.com/sponsors/andrejsshell)
</div>

<div align="center">
  <h3>
    <a href="https://cloud.kaneo.app">Cloud</a>
    <span> | </span>
    <a href="https://kaneo.app/docs/core/installation">Installation</a>
    <span> | </span>
    <a href="https://kaneo.app">Website</a>
    <span> | </span>
    <a href="https://discord.gg/rU4tSyhXXU">Discord</a>
  </h3>
</div>

<p align="center">
  Project management that doesn't become the project.
</p>

<p align="center">
  <img src="screenshots/readme@1x.png" srcset="screenshots/readme@1x.png 1x, screenshots/readme.png 2x" alt="Kaneo project board with the Kaneo logo and tagline" />
</p>

## KaneoB 当前功能

本仓库是在 [Kaneo](https://github.com/usekaneo/kaneo) 基础上定制的自托管项目与需求管理平台。下面的功能和部署说明对应本仓库源码；直接使用上游镜像不会包含这里新增的功能。

| 模块 | 当前功能 |
| --- | --- |
| 项目与任务 | 看板、列表、日历、甘特图、层级视图、待办；创建人、负责人、优先级、标签、计划与实际时间、进度、权重、子任务及进度汇总 |
| 需求 | 侧边栏独立入口；需求内容与属性、业务字段、节点计划/实际时间、独立工作流和列表；需求中不显示进度、汇总、权重和子任务 |
| 共用概览 | 超时/即将超时预警、可切换的“今日变更 / 数据统计”、按人看；点击条目打开详情；切换任务/需求、待办、看板及项目灵感页时保留上方卡片，随页面正常滚动 |
| 我的任务 | 个人超时预警、今日变更/数据统计、按人看；区分项目任务和需求，并支持来源筛选 |
| 项目看板 | 任务总数、在办、待验收、已逾期；逾期与临期任务、我的待办、状态分布、第一层任务专项概览及子任务汇总 |
| 需求看板 | 需求总数、已上线、已逾期、状态及增减、状态流转、风险与长期停留、每周趋势、功能分类、人员负载、节点风险；支持指标下钻、保存/查看/对比快照 |
| 报表导出 | Excel、PowerPoint、Word；PDF 使用浏览器打印中的“另存为 PDF” |
| 项目灵感 | 项目中与“任务 / 待办 / 项目看板”同级的“灵感”页签；快速记录、富文本、图片/附件、标签、搜索、状态筛选、置顶，以及采纳后转为任务并保留原灵感 |
| 协作 | 工作区、成员与权限、评论、活动历史、实时更新、任务关联；附件能力需要配置下文的对象存储 |

计划完成时间和需求节点计划时间使用半小时粒度，分钟选择 `00` 或 `30`。今日变更按当天展示状态、进度、计划时间、负责人和优先级等变化；需求同时记录业务字段及节点时间的变化。

### 需求字段与时间规则

- 内容区：需求名称、需求单号、类型、功能分类、需求描述、Benefit（价值说明）、备注和流转状态；创建需求时名称、类型、描述必填，单号未填写时自动生成。
- 属性区：需求部门、需求对接人、节点计划提供时间，以及 Design、Dev、Cross Test、UAT、Pirun、Prod 的计划完成/实际完成时间；Design 另有计划开始/实际开始。
- 节点实际时间由用户填写或修正；改变流转状态不会自动补齐全部实际时间。
- 总体时间由节点映射，编辑节点后同步更新总体字段：

| 总体字段 | 对应节点字段 |
| --- | --- |
| 计划开始 | Design 计划开始 |
| 实际开始 | Design 实际开始 |
| 计划结束 / DueDay | Prod 计划完成 |
| 实际结束 | Prod 实际完成 |

需求工作流为 `Backlog → Discussing → Planned → Design → Dev → Cross Test → UAT → Pirun → Prod`，另有 `Closed`、`Rejected` 结束状态。已上线按填写的 **Prod 实际完成时间**统计；仅把状态改成 Prod 不等同于已上线。

需求列表包含序号、需求单号、需求名称、需求描述、类型、功能分类、流程状态、当前处理人、创建人、DueDay、计划 Pirun、逾期天数、状态、创建时间、更新人、更新时间。流程状态使用不同颜色，前三列冻结，宽表可横向滚动。

### 看板统计口径

- 看板只统计当前选中的项目或需求集合；需求的多个逾期节点在看板“已逾期”总数中按需求去重，上方预警可分别列出节点。
- 项目看板的临期范围为未来 **2 个工作日**；工作日指周一至周五，不处理法定节假日，也不顺延任务截止时间。上方共用预警卡及需求看板的临期范围为未来 **24 小时**。
- 需求看板支持日期范围、本周、上周、最近 12 周；周统计按周一开始，报表日期按北京时间（UTC+8）计算。长期停留默认超过 3 天，可调整阈值。
- 历史趋势从本实例启用历史采集的迁移时点开始。早于覆盖范围的日期会显示无数据，首周可能是部分数据；未知的进入状态时间不推算。
- 快照保存当时的报表数据，可以跨快照比较；项目灵感在转成任务前不计入任务统计。

## 技术栈与运行结构

| 层 | 技术 |
| --- | --- |
| Web | React、TypeScript、Vite/Vite+、TanStack Router / Query、Tailwind CSS、Tiptap |
| API | Node.js、Hono、Zod/OpenAPI、Drizzle ORM、WebSocket |
| 数据库 | PostgreSQL 16 |
| 部署 | Docker Compose；`Dockerfile.kaneo` 将 Web 静态资源、Nginx 和 API 打包进一个应用容器，数据库使用独立容器 |
| 可选服务 | Redis/Valkey 用于多实例消息分发；S3 兼容对象存储用于附件；SMTP、GitHub 等集成按需配置 |

本地入口为 <http://localhost:5173>。Nginx 提供 Web 并代理 `/api` 到容器内 API；数据库只在 Compose 网络中使用，不向宿主机发布 5432 端口。单实例运行不需要 Redis。

## Windows Docker 部署：存储放 D 盘

以下命令使用 **PowerShell 7.4+**、Git 和 Docker Desktop（Linux 容器 / WSL 2），不需要在宿主机安装项目的 Node.js 依赖。首次构建需要联网下载基础镜像和依赖。

### 1. 区分 Docker 磁盘和项目目录

当前本地实例使用以下布局。仓库目录名保留为 `kaneoB`，数据目录与仓库同级：

```text
D:\codex_ENV\项目管理平台\
├── kaneoB\                       # Git 源码仓库
└── kaneoB-data\                  # 本项目私有部署与持久化数据
    ├── compose.yml               # 实际使用的 Compose 文件
    ├── .env                      # 数据库密码、认证密钥等；不上传 Git
    ├── postgres\                 # PostgreSQL 数据
    ├── runtime\                  # Web/Nginx 运行文件及应用临时文件
    ├── api-data\                 # API 预留的本地数据目录
    ├── backups\                  # 数据库备份
    └── logs\                     # 手动保存的运行/构建日志

D:\docker_image_location\DockerDesktopWSL\  # Docker Desktop 的全局磁盘位置
```

项目的 D 盘绑定挂载与 Docker Desktop 的全局磁盘设置是两件事：

| 宿主机目录（相对于 `kaneoB-data\compose.yml`） | 容器目录 | 用途 |
| --- | --- | --- |
| `./postgres` | `/var/lib/postgresql/data` | 用户、项目、需求、灵感、活动、报表快照等数据库数据 |
| `./runtime` | `/var/lib/kaneo` | Web 运行资源、Nginx 配置和临时文件 |
| `./api-data` | `/app/apps/api/data` | 预留 API 本地数据，不代表已经启用本地附件存储 |

`backups`、`logs` 是宿主机保存文件的目录，不是额外的容器数据卷；Docker 自身的容器日志使用带大小轮转的 `local` 驱动。镜像、容器可写层、构建缓存和 Docker 日志保存在 Docker Desktop 的全局磁盘中。

本机 Docker Desktop 的磁盘位置已设置为 `D:\docker_image_location\DockerDesktopWSL`。新机器需在 Docker Desktop 的 **Settings → Resources → Advanced → Disk image location** 中选择 D 盘位置并应用；这是 Docker 全局设置，影响其他 Docker 项目。仅把 Git 仓库克隆到 D 盘不会移动 Docker 磁盘。以 [Docker 官方 WSL 说明](https://docs.docker.com/desktop/features/wsl/)中的设置入口为准，不要在 Docker 运行时手工移动虚拟磁盘文件。

绑定目录的相对路径以部署文件所在目录为基础。因此模板需要复制到 `kaneoB-data\compose.yml`；其中 `build.context: ../kaneoB` 指向相邻源码目录。修改目录布局时同步调整这个构建路径。[Compose 相对路径说明](https://docs.docker.com/reference/compose-file/services/#volumes)

### 2. 首次安装：创建目录与私有配置

**已有本地实例直接使用后面的“日常启停与更新”，保留原有 `.env`、Compose 文件和数据库。** 下列初始化命令遇到已有仓库或私有配置会停止，避免重建密码。

仓库提供不含真实密钥的 [Compose 模板](deploy/compose.d-drive.example.yml) 和 [环境变量模板](deploy/d-drive.env.example)。模板应用镜像名为 `kaneob-local:latest`；已有实例可以沿用部署文件里的镜像标签，当前本机使用 `kaneob-local:ideas`。

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$projectRoot = 'D:\codex_ENV\项目管理平台'
$repoDir = Join-Path $projectRoot 'kaneoB'
$dataDir = Join-Path $projectRoot 'kaneoB-data'

if ((Test-Path -LiteralPath $repoDir) -or (Test-Path -LiteralPath (Join-Path $dataDir '.env')) -or (Test-Path -LiteralPath (Join-Path $dataDir 'compose.yml'))) {
    throw '已有源码或部署配置，请使用日常更新步骤，勿重复初始化。'
}
New-Item -ItemType Directory -Path $projectRoot -Force | Out-Null
git clone https://github.com/Wu1Zhe/kaneoB.git $repoDir
foreach ($folder in @('', 'postgres', 'runtime', 'api-data', 'backups', 'logs')) {
    New-Item -ItemType Directory -Path (Join-Path $dataDir $folder) -Force | Out-Null
}
Copy-Item -LiteralPath (Join-Path $repoDir 'deploy\compose.d-drive.example.yml') -Destination (Join-Path $dataDir 'compose.yml')

$dbPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$authSecret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$envText = Get-Content -LiteralPath (Join-Path $repoDir 'deploy\d-drive.env.example') -Raw
$envText = $envText.Replace('POSTGRES_PASSWORD=', "POSTGRES_PASSWORD=$dbPassword").Replace('AUTH_SECRET=', "AUTH_SECRET=$authSecret")
[IO.File]::WriteAllText((Join-Path $dataDir '.env'), $envText, [Text.UTF8Encoding]::new($false))
```

生成的 `.env` 包含 `KANEO_CLIENT_URL=http://localhost:5173`、`POSTGRES_HOST=postgres`、数据库名/用户 `kaneo`，以及两份独立的随机密钥。应用入口会由这些变量构造数据库连接并自动推导同源 API 地址，不需要填写带密码的 `DATABASE_URL`。保持 `AUTH_SECRET` 稳定可保留认证会话。

PostgreSQL 密码只在空数据目录首次初始化时设置；已有数据库不能只修改 `.env` 中的密码，否则应用会连接失败。部署私有文件放在 Git 仓库外，备份和分享日志时也应保护其中的密钥。

### 3. 构建并启动

```powershell
$dataDir = 'D:\codex_ENV\项目管理平台\kaneoB-data'
$composeArgs = @('--env-file', (Join-Path $dataDir '.env'), '-f', (Join-Path $dataDir 'compose.yml'))

# --quiet 只校验配置，避免把解析后的密码打印出来
docker compose @composeArgs config --quiet
docker compose @composeArgs build kaneo
docker compose @composeArgs up -d --wait --wait-timeout 240
docker compose @composeArgs ps
Invoke-RestMethod 'http://localhost:5173/api/health'
```

两个服务显示 `healthy` 后访问 <http://localhost:5173>。API 启动时自动运行仓库中的数据库迁移，因此更新前先做备份。首次数据库初始化和源码构建可能需要较长时间。

端口配置为 `127.0.0.1:5173:5173`，只供本机访问。若需要局域网访问，须同时调整端口绑定、`KANEO_CLIENT_URL` 与必要的 CORS/反向代理配置。

### 4. 日常启停与更新

在新的 PowerShell 窗口先定义路径和参数：

```powershell
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repoDir = 'D:\codex_ENV\项目管理平台\kaneoB'
$dataDir = 'D:\codex_ENV\项目管理平台\kaneoB-data'
$composeArgs = @('--env-file', (Join-Path $dataDir '.env'), '-f', (Join-Path $dataDir 'compose.yml'))

# 停止 / 启动 / 查看状态，按需分别执行
docker compose @composeArgs stop
docker compose @composeArgs up -d --wait --wait-timeout 240
docker compose @composeArgs ps

# 最近的应用日志；需要保存时写入 D 盘
docker compose @composeArgs logs --tail 100 kaneo
docker compose @composeArgs logs --no-color --tail 500 kaneo *> (Join-Path $dataDir 'logs\kaneo.log')
```

更新源码前检查本地修改，并先执行下一节的数据库备份。随后执行：

```powershell
git -C $repoDir status --short
git -C $repoDir pull --ff-only origin main
docker compose @composeArgs config --quiet
docker compose @composeArgs build kaneo
docker compose @composeArgs up -d --wait --wait-timeout 240
docker compose @composeArgs ps
Invoke-RestMethod 'http://localhost:5173/api/health'
```

本地存在修改时先保存或处理；`pull --ff-only` 失败时先处理分支差异。修改源码后必须重新构建镜像，单独 `restart` 不会编译新代码。更新沿用同一数据目录和 `.env`；旧版代码不一定兼容迁移后的数据库，回退需配套使用迁移前备份。

### 5. 数据库备份与恢复

下面使用 PostgreSQL 的 custom 格式（`-Fc`），先生成容器内文件，再复制到 D 盘，避免把二进制数据库备份通过文本管道写入。运行前使用上节的 `$dataDir`、`$composeArgs` 和错误处理设置：

```powershell
New-Item -ItemType Directory -Path (Join-Path $dataDir 'backups') -Force | Out-Null
$backupName = 'kaneob-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump'
$containerBackup = '/tmp/' + $backupName
$backupPath = Join-Path $dataDir (Join-Path 'backups' $backupName)
docker compose @composeArgs exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh $containerBackup
$postgresContainer = (docker compose @composeArgs ps -q postgres).Trim()
docker cp "${postgresContainer}:${containerBackup}" $backupPath
docker compose @composeArgs exec -T postgres pg_restore --list $containerBackup | Out-Null
docker compose @composeArgs exec -T postgres rm -f $containerBackup
Get-Item -LiteralPath $backupPath | Select-Object FullName, Length
```

同时妥善备份 `.env`、实际 `compose.yml` 和使用中的文件/对象存储。数据库 dump 包含任务与文件元数据，不包含 S3 对象内容；不要把运行中的 `postgres` 目录直接复制作为数据库逻辑备份。恢复时先在独立的 PostgreSQL 16 实例中用 `pg_restore` 验证 dump；覆盖现有实例前停止应用写入并另存当前备份。参见 [PostgreSQL 16 备份格式与恢复说明](https://www.postgresql.org/docs/16/app-pgdump.html)。

### 6. 附件存储的实际情况

当前本机没有配置 S3 对象存储，`api-data` 目录为空。描述、评论和灵感的文件上传依赖 S3 兼容对象存储；仅挂载 `./api-data` 不会自动启用本地附件上传。

需要附件功能时，在私有部署 `.env` 中配置 `S3_ENDPOINT`、`S3_BUCKET`，以及成对的 `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` 等变量，参考根目录 [.env.sample](.env.sample)。上传端点需能被应用容器和浏览器访问。若要求附件也全部保存在 D 盘，需要另外部署本地 S3 兼容存储并把其数据目录绑定到 D 盘；当前两容器模板未包含该服务。

## 上游项目说明

以下保留 Kaneo 上游的功能、贡献方式和许可证信息。

## Built for your team's work

- **See work your way:** Board, List, Calendar, and Gantt views, plus a backlog, filters, and search.
- **Keep task context together:** descriptions, attachments, subtasks, dependencies, labels, comments, and time tracking.
- **Work with your team:** shared workspaces, invitations, custom roles, live updates, and public project views.
- **Shape your workflow:** custom columns and fields, with rules that move tasks when repository activity changes.
- **Stay informed:** in-app notifications, email, ntfy, Gotify, and personal webhooks.
- **Connect other tools:** GitHub and Gitea, chat integrations, project webhooks, a [REST API](https://kaneo.app/docs/api-reference/introduction), a [command-line client](https://kaneo.app/docs/cli), and [MCP](https://kaneo.app/docs/core/integrations/mcp) for AI assistants.

## Installation

- **Cloud:** [Get started with Kaneo Cloud](https://cloud.kaneo.app).
- **Self-hosted:** Follow the [installation guide](https://kaneo.app/docs/core/installation).

## Contributing

Code, translations, documentation, and bug reports are welcome. Start with the [contributing guide](CONTRIBUTING.md) and [local development setup](ENVIRONMENT_SETUP.md). Pay particular attention to [contribution eligibility](https://github.com/usekaneo/kaneo/blob/main/CONTRIBUTING.md#contribution-eligibility).

Join us on [Discord](https://discord.gg/rU4tSyhXXU), report bugs in [GitHub Issues](https://github.com/usekaneo/kaneo/issues), or submit and vote on feature requests at [Kaneo Feedback](https://feedback.kaneo.app).

## Sponsors

Kaneo is open source. If you find it useful, consider [sponsoring the project](https://github.com/sponsors/andrejsshell) to help support ongoing development.

### Partners

<p>
  <img src="apps/site/public/images/blacksmith-powered.png" alt="CI powered by Blacksmith" width="368" />
</p>

This project is tested with BrowserStack.

### Community sponsors

<!-- sponsors --><a href="https://github.com/danielsada"><img src="https:&#x2F;&#x2F;github.com&#x2F;danielsada.png" width="60px" alt="User avatar: Daniel Sada" /></a><a href="https://github.com/randoneering"><img src="https:&#x2F;&#x2F;github.com&#x2F;randoneering.png" width="60px" alt="User avatar: (justin)randoneering" /></a><a href="https://github.com/ryanilano"><img src="https:&#x2F;&#x2F;github.com&#x2F;ryanilano.png" width="60px" alt="User avatar: Ryan Ilano" /></a><a href="https://github.com/blendbyte"><img src="https:&#x2F;&#x2F;github.com&#x2F;blendbyte.png" width="60px" alt="User avatar: Blendbyte" /></a><!-- sponsors -->

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <img src="https://repobeats.axiom.co/api/embed/3e8367ec2b2350e4fc48662df33c81dac657b833.svg" alt="Repobeats analytics image" />
</div>

<p align="center">
  Built with ❤️ by the Kaneo team and <a href="https://github.com/usekaneo/kaneo/graphs/contributors">contributors</a>
</p>
