import type { ReactNode } from "react";

type TabPlaceholderPageProps = {
  title: string;
  description: ReactNode;
};

export function TabPlaceholderPage({ title, description }: TabPlaceholderPageProps) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white px-6 py-10 shadow-sm">
      <h1 className="text-2xl font-bold text-amber-800">{title}</h1>
      <p className="mt-3 text-sm text-stone-600">{description}</p>
    </section>
  );
}
