export type MainTab = {
  label: "首页" | "记录" | "复习" | "卡片组";
  path: "/" | "/record" | "/review" | "/decks";
};

export const MAIN_TABS: MainTab[] = [
  { label: "首页", path: "/" },
  { label: "记录", path: "/record" },
  { label: "复习", path: "/review" },
  { label: "卡片组", path: "/decks" },
];
