import type { LandingLocale } from "./landingLocale";

export type LandingCopy = {
  localeLabel: string;
  backToApp: string;
  login: string;
  register: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  painTitle: string;
  painBefore: string;
  painBeforeItems: string[];
  painAfter: string;
  painAfterItems: string[];
  workflowTitle: string;
  workflowIntro: string;
  workflowSteps: Array<{ title: string; description: string }>;
  benefitTitle: string;
  benefitItems: Array<{ title: string; description: string }>;
  finalCtaTitle: string;
  finalCtaDescription: string;
};

export const LANDING_COPY: Record<LandingLocale, LandingCopy> = {
  "zh-CN": {
    localeLabel: "语言",
    backToApp: "进入应用",
    login: "登录",
    register: "注册",
    heroTitle: "把你的中文想法，练成自然英语表达",
    heroSubtitle:
      "不是背单词，而是从你真正想说的话开始，AI 帮你生成地道英文，再通过间隔复习练到脱口而出。",
    heroPrimaryCta: "免费开始",
    heroSecondaryCta: "了解更多",
    painTitle: "背了很多单词，遇到真实场景还是不会说？",
    painBefore: "传统方式",
    painBeforeItems: [
      "背单词表，脱离语境",
      "翻译软件，用完就忘",
      "学了很多，开口还是卡壳",
    ],
    painAfter: "Say Right",
    painAfterItems: [
      "从你想说的中文出发",
      "AI 给出地道英文表达",
      "间隔复习，练到真正会用",
    ],
    workflowTitle: "三步完成一条学习闭环",
    workflowIntro: "不是背单词，而是把真实表达反复练到会用。",
    workflowSteps: [
      {
        title: "输入你想说的中文",
        description: "从真实场景出发，先记录你真正会遇到的表达。",
      },
      {
        title: "AI 生成自然英文",
        description: "AI 给出地道英文后，你可以继续手动编辑打磨。",
      },
      {
        title: "间隔复习记到牢",
        description: "结合 FSRS 调度，在正确时间复习，减少遗忘。",
      },
    ],
    benefitTitle: "为什么选 Say Right",
    benefitItems: [
      {
        title: "地道表达，不是逐词翻译",
        description: "AI 理解你的意图，给出母语者真正会说的英文。",
      },
      {
        title: "卡片自动沉淀，不怕丢",
        description: "每条表达自动保存为复习卡片，随时回顾。",
      },
      {
        title: "科学复习，练到真正记住",
        description: "基于 FSRS 算法安排复习时间，告别「学了就忘」。",
      },
    ],
    finalCtaTitle: "现在就开始练习",
    finalCtaDescription: "免费使用，无需付费。",
  },
  en: {
    localeLabel: "Language",
    backToApp: "Open App",
    login: "Log In",
    register: "Sign Up",
    heroTitle: "Turn Chinese thoughts into natural English that sticks",
    heroSubtitle:
      "Not vocabulary drills — start from what you actually want to say. AI generates natural English, and spaced repetition helps you remember it.",
    heroPrimaryCta: "Get Started Free",
    heroSecondaryCta: "Learn More",
    painTitle: "Memorized tons of words but still can't express yourself?",
    painBefore: "Traditional way",
    painBeforeItems: [
      "Memorize word lists, out of context",
      "Translation apps, forgotten instantly",
      "Study a lot, still freeze when speaking",
    ],
    painAfter: "Say Right",
    painAfterItems: [
      "Start from what you want to say",
      "AI generates natural English",
      "Spaced review until you truly own it",
    ],
    workflowTitle: "A 3-step learning loop",
    workflowIntro: "Not memorization — practical expression training.",
    workflowSteps: [
      {
        title: "Type what you want to say in Chinese",
        description: "Start from real scenarios you actually encounter.",
      },
      {
        title: "AI generates natural English",
        description: "Get authentic English, then edit to make it yours.",
      },
      {
        title: "Review until it sticks",
        description: "FSRS-based scheduling so you review at the right time.",
      },
    ],
    benefitTitle: "Why Say Right",
    benefitItems: [
      {
        title: "Natural expressions, not word-by-word translation",
        description: "AI understands your intent and produces what native speakers actually say.",
      },
      {
        title: "Auto-saved cards, nothing gets lost",
        description: "Every expression becomes a review card you can revisit anytime.",
      },
      {
        title: "Science-backed review, truly remembered",
        description: "FSRS algorithm schedules reviews so you stop forgetting what you learned.",
      },
    ],
    finalCtaTitle: "Start practicing now",
    finalCtaDescription: "Free to use, no payment required.",
  },
};
