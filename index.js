/**
 * dsh-roboto-mono —— 宿主端空实现。
 *
 * 本插件只提供浏览器端能力：在页面里注册 @font-face（字体数据内嵌在
 * client.js 里，不依赖任何静态路由），并把 DSH 主题的等宽字体变量指到
 * "Roboto Mono"。
 *
 * 为什么要一条宿主端 entry：dsh-client-modules 只扫描 Loader 条目里
 * 声明了 `dsh.client` 的包，再按包名把 `exports["./client"]` 的 bundle
 * 注入页面。宿主端必须能被 import 成功，所以这里只导出空 apply。
 *
 * 这里导出的 `name` 是 Loader 条目 id（与 cordis.patch.yml 的 `id` 一致），
 * 不是 npm 包名；npm 包名见 package.json。
 *
 * @module dsh-roboto-mono
 */

/** Cordis 插件名（Loader 条目 id，供诊断使用）。 */
export const name = "dsh-roboto-mono";

/** 宿主端不依赖任何服务。 */
export const inject = [];

/** 宿主端插件体：空实现。 */
export function apply() {}
