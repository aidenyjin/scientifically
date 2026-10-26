import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "success"
  | "danger"
  | "secondary"
  | "ghost"
  | "gem"
  | "streak";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white [--edge:var(--brand-dark)]",
  success: "bg-correct text-white [--edge:var(--correct-dark)]",
  danger: "bg-wrong text-white [--edge:var(--wrong-dark)]",
  secondary:
    "bg-surface text-ink-soft border-2 border-line [--edge:var(--line)] hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 [--depth:0px]",
  gem: "bg-gem text-white [--edge:var(--gem-dark)]",
  streak: "bg-streak text-white [--edge:var(--streak-dark)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-xl [--depth:3px]",
  md: "h-11 px-5 text-[15px] rounded-2xl",
  lg: "h-13 px-7 text-base rounded-2xl",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

/** Chunky pressable button. Disabled state goes flat grey. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "pressable hover-lift inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wide uppercase select-none",
        sizes[size],
        disabled
          ? "border-0 bg-line text-muted [--edge:var(--line-strong)]"
          : variants[variant],
        block && "w-full",
        className,
      )}
      {...props}
    />
  );
});
