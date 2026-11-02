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

## Linux：自动备份、异地同步和受保护升级

[Linux 运维工具](deploy/linux)适用于 **同一台 Linux 主机上的 rootful Docker Engine + Compose、PostgreSQL 16 和本仓库打包镜像**。支持 Ubuntu 22.04/24.04 等提供 Python 3.10+、systemd、age、SSH/rsync 的系统，不使用远程 Docker context。现有 Windows Docker 实例仍沿用前面的配置。

这套工具不依赖宿主 Docker socket 暴露给其他容器。备份验证只启动唯一命名、无网络、无宿主数据挂载的临时 PostgreSQL 容器，并在完成后删除该临时容器及其匿名卷。

### 1. Linux 目录和保障范围

```text
/opt/kaneoB/                    # 源码，用于构建带提交号的镜像
/opt/kaneob-ops/                # 独立安装的运维工具
/etc/kaneob/ops.json            # 私有运维配置，0600
/data/kaneob/                   # 本项目数据目录
├── .env                       # 私有部署配置，0600
├── compose.yml
├── config/gateway.conf
├── postgres/                  # 永久数据库目录
├── runtime/                   # UID 1001 可写的运行目录
├── api-data/                  # API 预留本地文件目录
├── backups/                   # 加密数据归档、校验文件和同步状态
│   └── images/                # 本地构建镜像按版本加密留档
└── state/                     # 操作锁、版本记录、维护/恢复状态
```

Linux 模板有 `postgres`、`kaneo`、`gateway` 三个服务。应用和数据库不发布宿主端口，只有 gateway 默认监听 `127.0.0.1:5173`。gateway 在升级维护期间返回 HTTP 503；新版本健康检查和关键记录核对通过后才重新开放。外部 HTTPS 反向代理应只指向 gateway，不要绕过维护入口访问应用容器。

`data_mount` 指向实际数据盘挂载点，如 `/data`；脚本会检查挂载并使用禁止自动创建源目录的绑定挂载。若有意使用系统根分区，可配置 `data_mount: "/"`，不要把尚未挂上的数据盘当成空目录初始化。初始化会为 UID `1001:0` 设置运行和本地文件目录权限，不使用 `chmod 777`。

每份备份包括完整应用数据库、数据库一致性快照中的表记录数/关键表 ID 校验值、私有 `.env`、Compose、gateway 和运维 JSON 配置、本地 `api-data` 及可选对象存储导出。**在线备份的数据库导出与校验清单使用同一个导出快照**，并发写入不会导致两者时间点不同。临时数据库必须实际恢复成功且记录核对一致，归档才会发布；暂存前也会检查备份文件系统空间并保留至少 1 GiB 的安全余量。

私有配置与数据使用 [age 公钥加密](https://github.com/FiloSottile/age)，备份主机不需要解密私钥。SSH 采用已知主机校验和密钥登录；rsync 传输完成后，还要在异地执行 SHA-256 校验和磁盘刷新，成功后才写同步完成标记。SSH 私钥不打入备份包。本地构建的应用镜像按镜像 ID/加密公钥缓存一份加密镜像归档并同步；注册表镜像记录不可变 digest，恢复时必须能从注册表取得该版本。

### 2. 首次配置

以下示例在 **root shell** 中执行，域名、数据盘与异地地址替换成自己的值。先按 [Docker 官方 Linux 安装说明](https://docs.docker.com/engine/install/ubuntu/)安装 Docker Engine 和 Compose 插件。

```bash
apt-get update
apt-get install -y python3 age rsync openssh-client tzdata

git clone https://github.com/Wu1Zhe/kaneoB.git /opt/kaneoB
cd /opt/kaneoB
version=$(git rev-parse --short=12 HEAD)
docker build -f Dockerfile.kaneo -t "kaneob:$version" .

install -d -m 755 /opt/kaneob-ops /etc/kaneob
cp -R deploy/linux/. /opt/kaneob-ops/
chown -R root:root /opt/kaneob-ops /etc/kaneob
chmod -R go-w /opt/kaneob-ops /etc/kaneob
install -m 600 deploy/linux/ops.json.example /etc/kaneob/ops.json
```

在**单独的安全恢复机器**上生成 age 密钥，保存私钥的离线副本，仅把 `age-keygen -y` 输出的公钥填进服务器运维配置：

```bash
umask 077
age-keygen -o kaneob-recovery.agekey
age-keygen -y kaneob-recovery.agekey
```

在备份服务器创建仅能写专用备份目录的普通 SSH 账号，并安装 `rsync`、`sha256sum`、`sync` 等工具。应用服务器创建专用 SSH 密钥，人工核对备份服务器的 SSH 主机指纹并完成公钥登录配置；脚本不会自动接受未知主机或关闭主机校验。

编辑 `/etc/kaneob/ops.json`，填写 `root`、`data_mount`、`project`、真实 `age_recipient`、异地 SSH 主机/端口/目录、SSH 私钥和 `known_hosts` 路径。SSH 私钥须为 `0600`。运维 JSON 不执行 shell，远程目录使用不含空格的绝对路径。该格式针对 `.env` 中的稳定密码和认证密钥，不支持把应用数据库指向外部数据库或使用未纳入备份的 `*_FILE` 密钥。

```bash
# /data 已正确挂载；首次初始化要求目标数据目录为空
python3 /opt/kaneob-ops/main.py init \
  --image "kaneob:$version" --url https://projects.example.com

docker compose -p kaneob-linux --env-file /data/kaneob/.env \
  -f /data/kaneob/compose.yml pull postgres gateway
docker compose -p kaneob-linux --env-file /data/kaneob/.env \
  -f /data/kaneob/compose.yml up -d --wait --wait-timeout 300

# 第一次手工备份成功后再启用定时任务
python3 /opt/kaneob-ops/main.py backup
```

初始化只生成一次数据库密码和 `AUTH_SECRET`，不会覆盖已有部署。命令默认读取 `/etc/kaneob/ops.json`；自定义配置使用 `main.py --config /path/ops.json backup`，或设置 `KANEO_OPS_CONFIG`。

### 3. 定时任务、同步重试与保留策略

```bash
install -m 644 /opt/kaneob-ops/systemd/kaneob-backup.service /etc/systemd/system/
install -m 644 /opt/kaneob-ops/systemd/kaneob-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kaneob-backup.timer
systemctl list-timers kaneob-backup.timer
journalctl -u kaneob-backup.service -n 50
```

默认**每小时按北京时间触发，随机延迟最多 5 分钟**，关机错过时开机补执行一次。通过 systemd drop-in 修改时间，不覆盖仓库里的模板。备份、恢复、升级共用独占锁；重叠操作会失败退出，不会同时迁移或修改备份文件。[systemd 定时器说明](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html)

同步失败时，本地完整的加密归档和校验文件会保留，不标记异地成功；可以重试同一份文件：

```bash
python3 /opt/kaneob-ops/main.py sync /data/kaneob/backups/kaneob-实际文件名.tar.age
```

本地默认保留 30 天，只清理已成功同步的过期数据归档，保留最近一份以及当前版本对应的升级前恢复点；未同步归档和镜像缓存不自动删除。异地采用追加式同步，不使用 `--delete`，本地过期清理不会传播为远端删除。异地保留期、只增写/不可变备份和镜像缓存清理需在备份端独立管理。systemd 的失败状态和 journal 可接入服务器监控；本工具不内置邮件/聊天通知。

### 4. 升级：备份或异地校验失败就中止

```bash
cd /opt/kaneoB
git status --short
git pull --ff-only origin main
version=$(git rev-parse --short=12 HEAD)
docker build -f Dockerfile.kaneo -t "kaneob:$version" .
python3 /opt/kaneob-ops/main.py upgrade "kaneob:$version"
```

先处理源码中的本地修改；运维工具安装在独立目录，其自身更新应单独审阅后安装。升级命令会将目标镜像解析为固定镜像 ID，流程如下：

1. 校验数据挂载、数据库版本、服务状态和当前配置，准备新镜像。
2. 关闭 gateway 入口、停止旧应用及其后台写入。
3. 导出一致性数据库快照，在无网络临时 PostgreSQL 中完整恢复并核对记录；加密数据/配置和必要的本地镜像，异地同步并校验。
4. **只有全部成功才写入新镜像配置并启动新应用迁移**；备份、恢复校验或异地同步失败时不启动新版本，尝试恢复旧镜像，旧版本健康后才重新开放入口。
5. 新版本健康检查及用户、工作区、项目、任务、灵感、报表快照的记录数/ID 校验通过后记录版本并开放入口。

如果新版本可能已经执行迁移但启动/验收失败，应用会被停止，维护状态与 `state/recovery-required.json` 保留，后续自动备份/升级不会把这个状态当作正常版本。**不会自动用旧程序连接已经迁移过的数据库。** 查看状态文件中记录的升级前备份，按下一节恢复到新目录。若失败标记的 `phase` 是 `pre-backup`，说明尚未调用新版本启动；确认仍为旧镜像、数据库和旧应用健康后才可人工清理维护标记及失败状态。不要跳过这些检查直接删除标记。

### 5. 验证、灾难恢复与回退

从异地取回数据归档及同名 `.sha256`，本地镜像还需取回 `images/` 下对应的镜像归档和校验文件。远端 `.complete` 表示该文件通过了上传后的校验。保留 age 私钥、备份文件、运行版本和足够的临时磁盘空间；解密临时目录可通过 `TMPDIR` 指向有足够空间的数据盘。只恢复自己信任的备份。

```bash
# 私钥仅用于恢复/演练机器，权限 0600；不要放进仓库或同步到备份目录
chmod 600 /secure/kaneob-recovery.agekey
export TMPDIR=/data/kaneob/backups
python3 /opt/kaneob-ops/main.py verify \
  /data/kaneob/backups/kaneob-实际文件名.tar.age \
  --identity /secure/kaneob-recovery.agekey

# 新目录 + 新 Compose 项目 + 不同端口，原数据库不会被覆盖
python3 /opt/kaneob-ops/main.py restore \
  /data/kaneob/backups/kaneob-实际文件名.tar.age \
  --identity /secure/kaneob-recovery.agekey \
  --target-root /data/kaneob-restored --project kaneob-restored --port 15173
```

恢复会检查归档及内部文件校验值、拒绝越界路径/链接，先在临时数据库验证，再创建新实例。数据库使用归档配置中的原密码；运行镜像必须与备份记录的镜像 ID 一致。本地镜像从加密 `images/` 留档加载，注册表镜像按 digest 拉取，因此恢复机器须能读取相关注册表且架构与原服务器一致。数据库恢复使用 `pg_restore --exit-on-error --single-transaction`，任何错误都会中止。[PostgreSQL 恢复说明](https://www.postgresql.org/docs/16/app-pgrestore.html)

恢复失败时新目录保持维护状态，不清空旧数据；修正原因后使用另一个空目录重新恢复。**恢复成功也只启动数据库，不自动启动应用、邮件/webhook 等后台任务。** 仅做恢复演练时，停留在 `verify` 或 `restore` 即可。

正式接管时先确认旧实例停止写入，检查恢复配置中的外部集成和存储。恢复工具生成了指向新目录/新项目的运维配置示例，审阅 SSH 路径、对象备份命令和异地位置后安装，再显式激活：

```bash
install -m 600 /data/kaneob-restored/config/ops.restore.example.json /etc/kaneob/restored.json
# 先审阅 /etc/kaneob/restored.json 和新实例 .env，再正式启动
python3 /opt/kaneob-ops/main.py --config /etc/kaneob/restored.json \
  activate --url https://projects.example.com
```

激活会设置新的站点/API/CORS 地址，启动后台任务，在维护入口关闭期间核对原镜像、数据库和关键记录，通过后开放新端口。此时通过 SSH 隧道或临时反向代理验收新实例，再切换正式反向代理。手工执行新实例的备份成功后，再切换 systemd 使用的运维配置并启用定时备份；也可以安装为独立的 timer/service，避免两个实例共用错误配置。新服务器灾难恢复时，可先建立运维配置所指的 `root/state` 与 `root/backups` 目录用于操作锁和下载归档，不需要重新初始化原数据库。

备份恢复点之后已经接收的新写入不会出现在旧备份中。因此升级验收期间保持维护入口关闭；计划外故障的数据回退窗口取决于最近成功异地备份，小时级备份不等于零数据损失。这套脚本使用逻辑备份，未实现 WAL 连续归档/PITR。需要更小恢复窗口时再部署持续日志归档方案。

### 6. 启用附件后的备份和恢复

默认两端没有 S3 附件服务。启用 `S3_ENDPOINT` 后，必须在 `ops.json` 配置 `object_backup_command`，否则备份/升级会中止。该配置是可执行文件参数数组，不经过 shell，例如在另行安装配置 rclone 后：

```json
"object_backup_command": ["/usr/bin/rclone", "copy", "kaneob-s3:bucket-name", "{destination}"]
```

命令需成功导出桶中所需对象到给定目录；对象存储的凭据由该工具独立保护。在线备份时数据库和对象存储不共享事务快照，应使用对象版本/保留策略或供应商的一致性快照。升级备份会停止本应用写入；若有其他写入方，也需同时暂停。

包含外部对象的备份要求使用同样的 `restore` 参数并加 `--database-only`，只恢复和验证数据库，把对象导出到新实例的 `restored-objects/`；应用保持停止，恢复配置中的 S3 端点会被清空，避免误连原桶。将对象恢复到**新桶**，在新 `.env` 中配置新桶端点与凭据，并同步修改新运维配置中的对象备份命令。核对对象/记录后，用上一节的 `activate` 命令加 `--objects-restored` 正式接管。恢复前查看 `state/recovery-required.json` 并确认对应阶段，不要让两个实例同时写同一个存储。

仅需要解密文件、查阅原配置或自行恢复外部对象时，可使用：

```bash
python3 /opt/kaneob-ops/main.py unpack /data/kaneob/backups/kaneob-实际文件名.tar.age \
  --identity /secure/kaneob-recovery.agekey --destination /data/kaneob-recovery-private
```

该目录包含明文密钥和数据，应保持私有并在恢复完成后妥善清理。Linux 运维测试可在无宿主 socket 的容器内运行；使用合成数据的真实 PostgreSQL 16、age 和 SSH/rsync，Docker 传输边界由测试替身隔离：

```bash
docker build -f tests/linux-ops/Dockerfile -t kaneob-ops-tests .
docker run --rm --mount type=bind,source="$PWD",target=/workspace,readonly kaneob-ops-tests
```

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
