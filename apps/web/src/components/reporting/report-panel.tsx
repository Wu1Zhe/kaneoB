import type { ReactNode } from "react";
export function ReportPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-border/65 bg-card p-4 shadow-xs/5 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="font-semibold text-sm">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
