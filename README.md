# dsh-roboto-mono

[![CI](https://github.com/XiaoPb/dsh-roboto-mono/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/XiaoPb/dsh-roboto-mono/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xiaopb/dsh-roboto-mono.svg)](https://www.npmjs.com/package/@xiaopb/dsh-roboto-mono)
[![license](https://img.shields.io/npm/l/@xiaopb/dsh-roboto-mono.svg)](LICENSE)

DeepSeek Harness（DSH）字体插件：把 **Roboto Mono** 装进 DSH，并为它补两层
回退 —— **DejaVu Sans Mono**（框线、箭头、块元素、几何图形）和 **Nerd Font
图标子集**（Oh My Posh / Powerline 私用区字形）。代码块、diff 和 SSH 终端都会
用上，不再落到 Android WebView 的比例字体或缺字形。

> English: a DSH bundle that embeds Roboto Mono, DejaVu Sans Mono and a Nerd
> Font icon subset as `@font-face` data URIs, so code blocks and the
> `dsh-hardssh` terminal render monospace glyphs, box drawing and Oh My Posh
> icons without any network font request.

## 安装

DSH 插件市场 / 插件管理页搜索 `@xiaopb/dsh-roboto-mono`，或：

```sh
# npm 包（推荐）
dsh plugin --profile web add @xiaopb/dsh-roboto-mono

# 本地 checkout：在仓库根目录执行（路径按需替换）
dsh plugin --profile web add /absolute/path/to/dsh-roboto-mono

# 固定到某个发布 tag
dsh plugin --profile web add github:XiaoPb/dsh-roboto-mono#v1.0.0
```

安装器会把这个包写进 profile 的 `dependencies` 和 `dsh.profile.bundles`，包自带的
`cordis.patch.yml` 自动插入 Loader 行，**不需要改 profile 的 `cordis.patch.yml`**。
卸载时从插件页移除，或 `dsh plugin --profile web remove @xiaopb/dsh-roboto-mono`。

> 同一个 profile 里不要同时保留「手动 entry」和「bundle 安装」：会插入两条同 id
> 的 entry。迁移时先删手动行，再安装 bundle。

## 为什么需要三个字体

| 字体 | 覆盖 | 缺失会怎样 |
| --- | --- | --- |
| Roboto Mono Variable（wght 100–700） | Latin / Greek / Cyrillic / Vietnamese | 主题字体栈在手机上全都不存在，回退到比例字体，列对不齐 |
| DejaVu Sans Mono | `U+2500–257F` 框线、`U+2190–21FF` 箭头、`U+2580–259F` 块元素、`U+25A0–25FF` 几何图形 | 代码块 / 目录树 / diff 的框线变成缺字块 |
| RobotoMono NF（Nerd Font 子集，WOFF2） | Oh My Posh / Powerline 私用区图标（`U+E0B0`、`U+E0B6`、`U+F0A9`、`U+EA83`、`U+F00C/F00D` 等） | 浏览器画第一个字体的 `.notdef`，Roboto Mono 的 `.notdef` 是**实心方块**，提示符看起来像一串橙色实心块 |

步进也做过匹配：Roboto Mono `0.600em`、DejaVu `0.602em`，与 xterm 按
`0.6001em` 测量的单元格几乎一致，所以启用回退字体不会错列。

## 生效范围与优先级

- 默认值写在 client bundle 的 CSS 里：

  ```css
  --dsh-font-family-code: "Roboto Mono","DejaVu Sans Mono","RobotoMono NF","Droid Sans Mono",monospace;
  --dsh-font-family-terminal: …
  ```

- 用户在 **设置 → 外观** 显式选择的字体会写在 body 的 inline style 上，优先级
  更高，插件不会覆盖用户的选择。
- `dsh-hardssh` 在构造 xterm 时写死字体、不读主题，因此插件额外用一段
  `.xterm .xterm-rows { font-family: var(--dsh-font-family-terminal) !important }`
  覆盖。自定义终端字体时，请把 `DejaVu Sans Mono` / `RobotoMono NF` 留在字体栈里，
  否则 OMP 图标会再次缺字。
- 字体数据以 data URI 内嵌（DSH 的 `/plugins` 路由只服务 JS bundle，取不到包内
  字体文件），因此首屏没有额外网络请求，引擎升级也不会覆盖字体。

## 目录结构

```
.
├── .github/workflows/
│   ├── ci.yml                  # push/PR：契约检查 + 打包 + 消费者安装冒烟
│   └── release.yml             # tag / 手动：npm 发布 + GitHub Release
├── fonts/                      # 字体源文件与许可证（OFL / Bitstream / Apache-2.0）
├── scripts/
│   ├── verify-package.mjs      # 清单、bundle patch、client.js 契约检查
│   ├── smoke-test.mjs          # 无浏览器跑一遍 client bundle（loader/字体/清理）
│   └── release-notes.sh        # 生成完整发布说明（CI 与 release 共用）
├── build-client.mjs            # 生成 client.js（base64 内嵌）
├── client.js                   # 生成物，已提交，安装后直接可用
├── cordis.patch.yml            # bundle 自带 patch：插入本包的 Loader 行
├── index.js                    # 宿主端空插件，让 Loader / client-modules 发现本包
├── package.json
├── CHANGELOG.md
└── LICENSE
```

## 开发

只需要 Node.js ≥ 20，无运行时依赖。

```sh
npm run build     # 由 fonts/ 重新生成 client.js
npm run check     # 校验 client.js 未过期 + 清单/补丁契约 + 无头冒烟测试
npm pack --dry-run
```

修改字体后：

1. 替换 `fonts/` 里的源文件（保留对应的 `*LICENSE*.txt`）；
2. `npm run build` 重新生成 `client.js`；
3. `npm run check`，再把两个文件一起提交（CI 会挡住只改字体、忘了重建的提交）。

## 发布

发布同时产出两个地方，且版本号只有一个来源（`package.json`）：

- npm：`@xiaopb/dsh-roboto-mono`，带 provenance（可验证由本仓库的 GitHub Actions
  构建）；
- GitHub Release：tag `vX.Y.Z`，附件是 `npm pack` 出来的 tarball，可离线安装。

一次性配置（仓库 owner）：

1. 在 npm 创建 granular access token，`Read and write` 权限，只授权本包；
2. GitHub → Settings → Secrets and variables → Actions → 新建 `NPM_TOKEN`；
3. 仓库保持 **public**（`--provenance` 需要公开仓库与 `id-token: write`）。

发版：

```sh
# 1. 改 package.json 的 version，并在 CHANGELOG.md 记录
# 2. 提交并打 tag（tag 必须等于 v<version>，否则 release 工作流直接失败）
git add -A
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin master --tags
```

之后 `release.yml` 会：校验 tag ↔ version → `npm ci` + `npm run check` → 发布 npm
（已存在的版本自动跳过）→ `npm pack` 并生成 SHA-256 → 生成发布说明 → 创建/更新
GitHub Release。

Release 说明由 `scripts/release-notes.sh` 生成，CI 每轮都会跑一遍以防发版时才暴露
脚本错误，内容包括：

- **版本信息**：tag、npm 包链接、提交与提交数、构建时间、触发方式、DSH/Node 版本要求；
- **安装**：npm、离线 tarball、GitHub tag 三种方式；
- **发布产物**：tarball 大小与 SHA-256（附件同时提供 `.sha256` 文件）；
- **变更内容**：按 conventional commit 前缀分组（新功能 / 修复 / CI / 文档 …）；
- **质量校验**：自检项与本次 CI 运行链接；
- **贡献者**与**与上一 tag 的对比链接**。

也可以在 Actions → **Release** → *Run workflow* 手动触发（`ref` 默认 `master`）；
重跑同一版本只会刷新 Release 说明与附件，不会重复发布 npm。

## 验证

装好后打开 WebView 日志（engine.log 的 `[webview] console/...`），应看到：

```
[dsh-roboto-mono] font READY faces={"Roboto Mono":"loaded","DejaVu Sans Mono":"loaded","RobotoMono NF":"loaded"}
| code-var="\"Roboto Mono\", \"DejaVu Sans Mono\", \"RobotoMono NF\", …"
| icons=true | mono=true advance=60.00
| xterm="\"Roboto Mono\", \"DejaVu Sans Mono\", \"RobotoMono NF\", …"
```

`xterm=` 只有在 SSH 终端面板打开后才不是 `(no xterm)`，它是覆盖样式生效的直接证据；
`icons=true` 表示 Nerd Font 图标码位有真实字形。

## 已知限制

- 只支持 Web 端（`dsh.client.platform = "web"`），Desktop 的终端不归本插件管。
- 字体全部内嵌，`client.js` 约 1.1 MB；这是「无网络请求 + 不怕引擎升级」的代价。
- 自定义终端字体时若去掉回退字体，OMP 图标会重新变成实心块；步进差异大的字体
  仍可能让 xterm 单元格错列（xterm 按自身测量结果定位）。
- 仓库内 `client.js` 是生成物，code review 请看 `build-client.mjs` 与 `fonts/`。

## 来源与许可

- Roboto Mono：<https://github.com/googlefonts/RobotoMono>（SIL OFL 1.1）
- DejaVu Sans Mono：<https://github.com/dejavu-fonts/dejavu-fonts>（2.37，Bitstream Vera 派生许可）
- RobotoMono Nerd Font：<https://github.com/ryanoasis/nerd-fonts>（v3.5.1；基础字体 OFL 1.1，
  图标集各自 MIT / CC BY 4.0 / Apache 2.0 / OFL，详见 `fonts/RobotoMonoNF-LICENSE.txt`）
- 本仓库代码：MIT，见 [LICENSE](LICENSE)
