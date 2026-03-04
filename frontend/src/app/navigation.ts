export type Tab = {
  label: string;
  path: string;
};

/** 桌面端顶部导航 4 个主 Tab（不含"我的"） */
export const DESKTOP_TABS: Tab[] = [
  { label: "首页", path: "/" },
  { label: "记录", path: "/record" },
  { label: "复习", path: "/review" },
  { label: "卡片组", path: "/decks" },
];

/** 手机端底部导航 5 个 Tab（含"我的"） */
export const MOBILE_TABS: Tab[] = [
  { label: "首页", path: "/" },
  { label: "记录", path: "/record" },
  { label: "复习", path: "/review" },
  { label: "卡片组", path: "/decks" },
  { label: "我的", path: "/me" },
];

/** @deprecated 使用 DESKTOP_TABS 替代 */
export const MAIN_TABS = DESKTOP_TABS;
