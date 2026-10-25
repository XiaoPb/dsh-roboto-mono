/**
 * Build client.js for dsh-roboto-mono.
 *
 * All fonts are embedded as base64 data URIs on purpose: the DSH `/plugins`
 * route only serves JavaScript client bundles, so a package-local font file
 * would 404 in the browser. Embedding also keeps the plugin self-contained
 * across engine upgrades and avoids a network request at first paint.
 *
 * - Roboto Mono Variable: Latin/Greek/Cyrillic/Vietnamese, wght 100-700.
 * - DejaVu Sans Mono: fallback for symbols Roboto Mono does not contain
 *   (box drawing U+2500-257F, arrows U+2190-21FF, block elements,
 *   geometric shapes).
 * - RobotoMono NF (WOFF2 subset): Oh My Posh / Nerd Font private-use glyphs
 *   (Powerline separators, folder/git/status icons) used by the SSH prompt.
 *
 * Usage:
 *   node build-client.mjs           # regenerate client.js
 *   node build-client.mjs --check   # fail if client.js is out of date
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const robotoPath = join(here, "fonts", "RobotoMono-VF.ttf");
const dejavuPath = join(here, "fonts", "DejaVuSansMono.ttf");
const nerdPath = join(here, "fonts", "RobotoMonoNF-Symbols.woff2");
const roboto = readFileSync(robotoPath);
const dejavu = readFileSync(dejavuPath);
const nerd = readFileSync(nerdPath);

const css = [
  "/* Roboto Mono Variable (wght 100-700), SIL OFL 1.1 — see fonts/OFL.txt */",
  "@font-face{",
  'font-family:"Roboto Mono";',
  "font-style:normal;",
  "font-weight:100 700;",
  "font-display:swap;",
  "src:url(data:font/ttf;base64," + roboto.toString("base64") + ') format("truetype")',
  "}",
  "/* DejaVu Sans Mono: box drawing / arrows / block elements / geometric shapes",
  "   that Roboto Mono lacks. DejaVu license in fonts/DejaVu-LICENSE.txt. */",
  "@font-face{",
  'font-family:"DejaVu Sans Mono";',
  "font-style:normal;",
  "font-weight:400;",
  "font-display:swap;",
  "src:url(data:font/ttf;base64," + dejavu.toString("base64") + ') format("truetype")',
  "}",
  "/* RobotoMono Nerd Font Mono (subset): Oh My Posh / Powerline private-use",
  "   glyphs (U+E0A0-E0B3, U+E5FA-E6B7, U+E700-E7C5, U+EA60-EBEB, U+F000-F4FF).",
  "   PUA glyphs are absent from Roboto Mono and DejaVu; without this face the",
  "   prompt icons fall back to Roboto Mono's solid .notdef boxes. */",
  "@font-face{",
  'font-family:"RobotoMono NF";',
  "font-style:normal;",
  "font-weight:400;",
  "font-display:swap;",
  "src:url(data:font/woff2;base64," + nerd.toString("base64") + ') format("woff2")',
  "}",
  "/* Fallback defaults; an explicit Appearance setting still wins (inline style). */",
  "body{",
  '--dsh-font-family-code:"Roboto Mono","DejaVu Sans Mono","RobotoMono NF","Droid Sans Mono",monospace;',
  '--dsh-font-family-terminal:"Roboto Mono","DejaVu Sans Mono","RobotoMono NF","Droid Sans Mono",monospace',
  "}",
  "/* 使用 --dsh-font-family-terminal：用户显式设置时优先，未设置时用 body 兜底。",
  "   位宽仍按 xterm 原字体测量（0.6001em），Roboto 0.600em / DejaVu 0.602em",
  "   与之几乎一致，不会错列。 */",
  '.xterm .xterm-rows{font-family:var(--dsh-font-family-terminal,"Roboto Mono","DejaVu Sans Mono","RobotoMono NF","Droid Sans Mono",monospace)!important}',
].join("\n");

const source = `/**
 * [dsh-android] Roboto Mono + DejaVu + Nerd Font 图标回退 —— 浏览器端 bundle。
 *
 * 症状：Android WebView 的主题等宽字体栈是
 *   "SF Mono", "JetBrains Mono", "Fira Code", Consolas, "Liberation Mono",
 *   Menlo, Courier, "PingFang SC", "Microsoft YaHei"
 * 这些字体在手机上基本都不存在，也没有以 generic \`monospace\` 收尾，于是
 * 代码块 / diff / 终端落到浏览器默认字体（Android 上是比例字体 Roboto）：
 * 列对不齐，部分符号按比例字体的字形显示。
 *
 * 三层回退：
 *   · Roboto Mono：Latin / Greek / Cyrillic / Vietnamese（主字体）；
 *   · DejaVu Sans Mono：框线、箭头、块元素、几何图形；
 *   · RobotoMono NF（Nerd Font 子集）：Oh My Posh / Powerline 的私用区图标
 *     （U+E0B0/U+E0B6、U+F0A9 文件夹、U+EA83、U+F00C/F00D 等）。
 *
 * 为什么需要 Nerd Font：oh-my-posh 的提示符用 Powerline 分隔符和图标字形。
 * 这些字符在 Roboto Mono / DejaVu 里都不存在；缺字时浏览器画的是第一个
 * 字体的 .notdef，而 Roboto Mono 的 .notdef 是实心方块 —— 于是提示符看起来
 * 像一串橙色实心块。补上 Nerd Font 子集后这些码位才有真实字形。
 *
 * 为什么这样改：
 *   · 字体设置（--dsh-font-family-code / -terminal）由主题插件写进 body 的
 *     inline style；本插件只提供 @font-face 与兜底变量，用户以后在
 *     设置→外观里改字体时 inline 值仍然优先，不会互相打架；
 *   · dsh-hardssh 的 Terminal 构造把 fontFamily 写死，改主题设置影响不到它，
 *     用一段 \`!important\` 的 xterm 行样式覆盖即可，无需改引擎文件；
 *   · 引擎升级会覆盖源码与 dist，profile 插件与字体数据不会被覆盖。
 *
 * 资源：字体数据以 data URI 内嵌（DSH 的 /plugins 路由只服务 JS bundle，
 * 不能直接取包内字体文件），所以首屏无需额外网络请求。
 *
 * 许可证：Roboto Mono / DejaVu / RobotoMono Nerd Font 均为 SIL OFL 1.1
 * （DejaVu 另含 Bitstream Vera 许可），见 fonts/ 下的许可证文件。
 *
 * @module dsh-roboto-mono/client
 */

window.__ModuleLoader__.load({
  id: "dsh-roboto-mono",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;

    var STYLE_ID = "dsh-roboto-mono-style";
    var CSS = __FONT_CSS__;
    var timers = [];

    function removeNode(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }

    /**
     * 注入字体样式表，并在真实 WebView 里验证字体确实可用。
     * 验证日志走 console.warn，App 会把它转发到 engine.log（[webview] console/...），
     * 因此安装后可以直接从引擎日志确认字体已加载，而不是只凭“代码看起来对”。
     *
     * @param {object} ctx 客户端 Cordis 上下文。
     * @returns {() => void} 卸载函数。
     */
    function apply(ctx) {
      // 幂等：重复激活（HMR / 重新加载插件）时先清掉上一份，避免叠加。
      removeNode(document.getElementById(STYLE_ID));

      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      (document.head || document.documentElement).appendChild(style);

      /**
       * 用宽度测量证明等宽角色实际选中了等宽字体：
       * 100px 下 "M" 与 "i" 的步进必须相等（Roboto Mono 为 0.6em → 60px）。
       * 只依赖 CSS 变量，不依赖页面上是否正好有代码块。
       */
      function measure() {
        var host = document.body || document.documentElement;
        var el = document.createElement("span");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        el.style.top = "0";
        el.style.visibility = "hidden";
        el.style.whiteSpace = "pre";
        el.style.fontSize = "100px";
        el.style.lineHeight = "1";
        el.style.fontFamily = "var(--dsh-font-family-code)";
        el.textContent = "MMMMMMMMMM";
        host.appendChild(el);
        var m = el.getBoundingClientRect().width / 10;
        el.textContent = "iiiiiiiiii";
        var i = el.getBoundingClientRect().width / 10;
        host.removeChild(el);
        return { m: m, i: i };
      }

      /** 报告字体是否真的可用 + 当前等宽字体变量与 SSH 终端的实际渲染字体。 */
      function report(ok, detail) {
        var bodyStyle = getComputedStyle(document.body);
        var codeVar = bodyStyle.getPropertyValue("--dsh-font-family-code").trim();
        var termVar = bodyStyle.getPropertyValue("--dsh-font-family-terminal").trim();
        var sample = document.querySelector("pre code, pre, code");
        var sampleFont = sample ? getComputedStyle(sample).fontFamily : "(none)";
        var rows = document.querySelector(".xterm-rows");
        var xtermFont = rows ? getComputedStyle(rows).fontFamily : "(no xterm)";
        var faces = {};
        if (document.fonts && document.fonts.forEach) {
          document.fonts.forEach(function (face) {
            var family = String(face.family || "").replace(/^["']|["']$/g, "");
            if (family === "Roboto Mono" || family === "DejaVu Sans Mono" || family === "RobotoMono NF") {
              faces[family] = face.status;
            }
          });
        }
        var probe;
        try {
          probe = measure();
        } catch (error) {
          probe = { m: -1, i: -1 };
        }
        console.warn(
          "[dsh-roboto-mono] " + (ok ? "font READY" : "font MISSING") +
          " faces=" + JSON.stringify(faces) +
          (detail ? " detail=" + detail : "") +
          " | code-var=" + JSON.stringify(codeVar) +
          " | terminal-var=" + JSON.stringify(termVar) +
          " | mono=" + (Math.abs(probe.m - probe.i) < 0.1) +
          " advance=" + probe.m.toFixed(2) +
          " | icons=" + (document.fonts && document.fonts.check ? document.fonts.check('12px "RobotoMono NF"', "\ue0b6\ue0b0\uea83\uf0a9") : "n/a") +
          " | xterm=" + JSON.stringify(xtermFont) +
          " | sample=" + JSON.stringify(sampleFont)
        );
      }

      if (document.fonts && document.fonts.load) {
        Promise.all([
          document.fonts.load('12px "Roboto Mono"'),
          document.fonts.load('12px "DejaVu Sans Mono"', "╭─╮"),
          document.fonts.load('12px "RobotoMono NF"', "\ue0b6\ue0b0\uea83\uf0a9")
        ]).then(function () {
          report(true, "");
          // HMR 同一次事务里主题设置可能晚于本插件落地；再等一拍报告稳定态，
          // 顺带在 SSH 终端重挂载后确认它的 .xterm-rows 实际字体。
          [800, 2500].forEach(function (ms) {
            timers.push(window.setTimeout(function () {
              report(true, "settled+" + ms + "ms");
            }, ms));
          });
        }, function (error) {
          report(false, error && error.message ? error.message : String(error));
        });
      } else {
        report(false, "FontFaceSet unavailable");
      }

      // SSH 终端只在用户点“连接”后挂载；用低频探测补一条日志，确认覆盖样式
      // 在真实 xterm DOM 上生效（最多查 5 分钟，不常驻）。
      var xtermTicks = 0;
      var xtermWatch = window.setInterval(function () {
        if (++xtermTicks > 150) {
          window.clearInterval(xtermWatch);
          return;
        }
        var rows = document.querySelector(".xterm-rows");
        if (!rows) return;
        window.clearInterval(xtermWatch);
        console.warn(
          "[dsh-roboto-mono] xterm-appeared font=" +
          JSON.stringify(getComputedStyle(rows).fontFamily)
        );
      }, 2000);

      function dispose() {
        window.clearInterval(xtermWatch);
        timers.forEach(function (timer) { window.clearTimeout(timer); });
        removeNode(style);
      }
      if (ctx && typeof ctx.effect === "function") ctx.effect(function () { return dispose; });
      return dispose;
    }

    exports.apply = apply;
    return module.exports;
  },
});
`;

const output = source.replace("__FONT_CSS__", JSON.stringify(css));
const target = join(here, "client.js");
const check = process.argv.includes("--check");
if (check) {
  const current = readFileSync(target, "utf8");
  if (current !== output) {
    console.error("client.js is stale: run `npm run build` and commit the result");
    process.exit(1);
  }
  console.log("client.js is up to date", "css", css.length, "client", output.length);
} else {
  writeFileSync(target, output);
  console.log(
    "wrote", target,
    "css", css.length,
    "client", output.length,
    "roboto", roboto.length,
    "dejavu", dejavu.length
  );
}
