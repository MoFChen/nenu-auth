# nenu-auth

东北师范大学校园网命令行认证工具，使用深澜（SRun）认证接口完成登录。适合在终端、服务器或无图形界面的设备上进行一次性校园网认证。

[![Build and release](https://github.com/MoFChen/nenu-auth/actions/workflows/release.yml/badge.svg)](https://github.com/MoFChen/nenu-auth/actions/workflows/release.yml)
[![Releases](https://img.shields.io/github/v/release/MoFChen/nenu-auth)](https://github.com/MoFChen/nenu-auth/releases)

## 功能

- 检查当前网络连接的在线状态；已在线时直接结束。
- 支持交互输入账号和密码；输入密码时以 `*` 显示。
- 支持指定认证请求中上报的操作系统与设备类型。
- 提供详细日志，便于排查认证问题。
- 通过 GitHub Actions 构建多平台独立可执行文件并发布到 Release；下载后无需安装 Node.js、Bun 或 npm 依赖。

## 使用前提

先连接校园网络，并确保设备能够访问认证服务器 `http://10.100.100.152`，同时准备有效的校园网账号与密码。

当前认证地址、`ac_id=1`、`n=200`、`type=1` 和 `enc_ver=srun_bx1` 固定在 `nenu-auth.js` 的 `API` 与 `CST` 中。其他校区或其他深澜部署若使用不同参数，需要修改源码后重新构建。

这是一次性认证程序。检测到已在线时，它不会核对在线账号是否与输入账号一致；需要切换账号时，请先通过校园网门户退出原会话。

## 下载独立程序

首次发布后，可在 [Releases](https://github.com/MoFChen/nenu-auth/releases) 下载与设备匹配的文件。以下以 `v1.0.0` 为例；实际文件名中的版本号以 Release 标签为准。

| 系统 / 架构 | Release 文件 |
| --- | --- |
| Windows x64 | `nenu-auth-v1.0.0-windows-x64.zip` |
| Windows ARM64 | `nenu-auth-v1.0.0-windows-arm64.zip` |
| macOS Intel | `nenu-auth-v1.0.0-darwin-x64.tar.xz` |
| macOS Apple Silicon | `nenu-auth-v1.0.0-darwin-arm64.tar.xz` |
| Linux x64，glibc | `nenu-auth-v1.0.0-linux-x64.tar.xz` |
| Linux ARM64，glibc | `nenu-auth-v1.0.0-linux-arm64.tar.xz` |
| Linux x64，musl / Alpine | `nenu-auth-v1.0.0-linux-x64-musl.tar.xz` |
| Linux ARM64，musl / Alpine | `nenu-auth-v1.0.0-linux-arm64-musl.tar.xz` |

每个压缩包包含程序、README 和依赖许可证。Release 另附 `SHA256SUMS`，记录所有压缩包的 SHA-256。

独立程序包含 Bun 运行时，仍受其系统要求约束：Windows 10 1809 或更新版本、macOS 13 或更新版本；Linux 的 glibc 版本需要 2.17 或更新版本。x64 处理器需要支持 SSE4.2。Alpine Linux 应选择 `musl` 版本。详见 [Bun 系统要求](https://bun.sh/docs/installation)。

### Linux / macOS

```bash
# 按设备实际系统和架构替换文件名
tar -xJf nenu-auth-v1.0.0-linux-x64.tar.xz
cd nenu-auth-v1.0.0-linux-x64
chmod +x nenu-auth

./nenu-auth --help
./nenu-auth -u 你的学号
```

macOS 用户可将最后一条命令改为 `./nenu-auth -u 你的学号 -s "Mac OS"`。发布程序若系统阻止运行，可在核对下载来源与校验值后，通过“系统设置 → 隐私与安全性”允许打开。

### Windows PowerShell

```powershell
Expand-Archive .\nenu-auth-v1.0.0-windows-x64.zip -DestinationPath .
cd .\nenu-auth-v1.0.0-windows-x64

.\nenu-auth.exe --help
.\nenu-auth.exe -u 你的学号 -s "Windows 11"
```

### 校验下载文件

下载目标压缩包和同一个 Release 的 `SHA256SUMS` 后，在两者所在目录执行：

```bash
# Linux：只校验本地已下载的文件
sha256sum --ignore-missing -c SHA256SUMS

# macOS：将输出与 SHA256SUMS 中对应文件的值比较
shasum -a 256 nenu-auth-v1.0.0-darwin-arm64.tar.xz
```

```powershell
# Windows：将 Hash 与 SHA256SUMS 中对应文件的值比较
Get-FileHash .\nenu-auth-v1.0.0-windows-x64.zip -Algorithm SHA256
```

## 命令行参数

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `-u, --username <username>` | 校园网账号 / 学号；省略时交互输入 | 无 |
| `-p, --password <password>` | 密码；省略时交互输入 | 无 |
| `-s, --os <os>` | 认证请求中上报的系统名称 | `Linux` |
| `-v, --verbose` | 输出详细调试日志 | 关闭 |
| `-V, --version` | 显示程序版本 | — |
| `-h, --help` | 显示帮助 | — |

`--os` 接受以下值，包含空格的值需要加引号：

```text
Windows 11, Windows 10, Windows NT, Mac OS,
iOS, Unix, Linux, FreeBSD, Android
```

该参数控制上报信息，不会自动识别当前系统；所有平台默认都上报 `Linux`。小写 `-v` 表示详细日志，大写 `-V` 表示版本。

```bash
# 交互输入账号和密码
./nenu-auth

# 指定账号，交互输入密码（推荐）
./nenu-auth -u 2026123456

# 指定上报的系统
./nenu-auth -u 2026123456 -s "Windows 10"

# 查看详细日志
./nenu-auth -u 2026123456 --verbose

# 非交互使用；请替换示例凭据
./nenu-auth -u 2026123456 -p 'YOUR_PASSWORD'
```

命令行密码可能留在 Shell 历史或进程参数中，日常使用建议交互输入。详细日志包含认证响应和认证参数，分享日志前请删除账号、IP、挑战值及认证数据。程序当前通过 HTTP 访问认证服务器，请在可信校园网络中使用。

认证成功或检测到已在线时，程序正常退出；发生错误时打印 `nenu-auth: ...` 并以退出码 `1` 结束。

## 从源码运行

安装 [Bun](https://bun.sh/docs/installation)；发布工作流固定使用 **Bun 1.4.3**。

```bash
git clone https://github.com/MoFChen/nenu-auth.git
cd nenu-auth

bun install --frozen-lockfile --ignore-scripts
bun ./nenu-auth.js -u 你的学号
```

也可在安装依赖后使用 Node.js 运行，推荐 Node.js **24.x，且版本不低于 24.15.0**：

```bash
node ./nenu-auth.js -u 你的学号
```

`bun.lock` 用于固定 Bun 构建依赖；原有 pnpm 配置和 `pnpm-lock.yaml` 保留。更新依赖时，请一并更新使用中的锁文件。

## 本地构建

```bash
bun install --frozen-lockfile --ignore-scripts

# 为当前平台生成独立可执行文件
bun build ./nenu-auth.js --compile --minify \
  --no-compile-autoload-dotenv --no-compile-autoload-bunfig \
  --outfile ./dist/nenu-auth

# 示例：交叉构建 Windows x64
bun build ./nenu-auth.js --compile --minify \
  --no-compile-autoload-dotenv --no-compile-autoload-bunfig \
  --target bun-windows-x64 --outfile ./dist/nenu-auth.exe
```

其他目标可使用 `bun-linux-x64`、`bun-linux-arm64`、`bun-linux-x64-musl`、`bun-linux-arm64-musl`、`bun-darwin-x64`、`bun-darwin-arm64` 和 `bun-windows-arm64`。交叉构建的文件应在对应系统与架构上运行。详见 [Bun 独立程序构建文档](https://bun.sh/docs/bundler/executables)。

## 常见问题

| 现象 | 排查方法 |
| --- | --- |
| 无法连接或请求一直重试 | 检查是否连接校园网，以及 `10.100.100.152` 是否可达；检查代理、路由和防火墙设置。 |
| `Already logged in.` | 当前网络连接已在线，程序直接退出；如需更换账号，先在校园网门户退出。 |
| `Invalid operating system specified.` | 使用 `--os` 支持的值，并为含空格的名称加引号。 |
| `Retries exceeded!` | 网络请求、HTTP 状态或 JSONP 解析反复失败；检查认证服务器是否可达、门户接口是否已变化。 |
| `GLIBC_... not found` / Linux 程序无法启动 | 确认 CPU 架构，升级系统运行库，或选择适合系统的 musl 版本。 |
| Workflow 提示版本不一致 | 标签去掉 `v` 后必须与 `package.json` 和 CLI 上报的版本一致。 |
| Workflow 依赖安装提示锁文件不一致 | 在更新依赖后重新生成并提交 `bun.lock`。 |

## 许可证

`package.json` 声明项目许可证为 **MIT**。独立程序使用的 Bun、commander、read 和 mute-stream 按各自许可证分发；构建压缩包中的 `THIRD_PARTY_LICENSES.txt` 收录相关声明。
