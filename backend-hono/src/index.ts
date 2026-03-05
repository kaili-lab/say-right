/**
 * Cloudflare Workers 入口。
 * WHAT: 暴露 fetch handler。
 * WHY: 与 wrangler.main 对齐，保证 `wrangler dev` 可直接启动。
 */
import { app } from './app';

export default app;
