/**
 * Shared UI primitives. One control vocabulary across both portals: the same
 * button shapes, chips, inputs and states everywhere.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-forest text-ivory hover:bg-forest-hover active:bg-forest-hover disabled:bg-forest/45",
  secondary: "border border-line-strong bg-surface text-ink-strong hover:border-forest/50 hover:bg-forest-tint/60 disabled:text-ink-muted",
  ghost: "text-forest hover:bg-forest-tint/70 disabled:text-ink-muted",
  danger: "bg-terracotta-ink text-ivory hover:bg-[#7a3d24] disabled:bg-terracotta-ink/45",
  gold: "bg-gold text-ink-strong hover:bg-[#c99b3d] disabled:bg-gold/45",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-sm",
  md: "h-10 gap-2 px-3.5 text-[0.9375rem]",
  lg: "h-12 gap-2 px-5 text-base",
  xl: "min-h-14 gap-3 px-5 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon: Icon, loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-control font-semibold transition-colors duration-150 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : Icon ? <Icon aria-hidden className={size === "xl" ? "size-6" : "size-4"} /> : null}
      {children}
    </button>
  );
});

export type Tone = "forest" | "sage" | "gold" | "terracotta" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  forest: "bg-forest-tint text-forest",
  sage: "bg-sage-tint text-sage-ink",
  gold: "bg-gold-tint text-gold-ink",
  terracotta: "bg-terracotta-tint text-terracotta-ink",
  neutral: "bg-sunken text-ink",
};

/** Status chip: always text (and usually an icon), never colour alone. */
export function Chip({ tone = "neutral", icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold", TONE_CHIP[tone], className)}>
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cx("min-w-0 rounded-panel border border-line bg-surface shadow-panel", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-[1.625rem] font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-ink">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-dashed border-line-strong bg-canvas/60 px-6 py-8 text-center">
      <Icon aria-hidden className="size-7 text-sage-ink" />
      <p className="mt-2 font-semibold text-ink-strong">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-ink">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("skeleton", className)} />;
}

export function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink-strong">
      {children}
      {hint && <span className="ml-1.5 font-normal text-ink-muted">{hint}</span>}
    </label>
  );
}

const control =
  "w-full rounded-control border border-line-strong bg-surface px-3 text-ink-strong placeholder:text-ink-muted/80 transition-colors hover:border-forest/40 focus:border-forest focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 aria-[invalid=true]:border-terracotta-ink disabled:bg-sunken disabled:text-ink-muted";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(control, "h-10", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(control, "min-h-24 py-2 leading-relaxed", className)} {...rest} />;
});

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-terracotta-ink">
      {children}
    </p>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-control border border-line-strong bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[4px] px-3 py-1.5 text-sm font-semibold transition-colors",
            value === o.value ? "bg-surface text-forest shadow-panel" : "text-ink hover:text-ink-strong",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compact stat for KPI strips: label first, value, and a short context line. */
export function Stat({ label, value, context, tone }: { label: string; value: ReactNode; context?: ReactNode; tone?: "gold" | "terracotta" }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={cx("tabular mt-0.5 text-2xl font-semibold leading-tight", tone === "terracotta" ? "text-terracotta-ink" : tone === "gold" ? "text-gold-ink" : "text-ink-strong")}>{value}</p>
      {context && <p className="mt-0.5 text-sm text-ink">{context}</p>}
    </div>
  );
}
