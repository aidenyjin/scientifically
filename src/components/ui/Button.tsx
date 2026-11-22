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
  primary: "bg-ink text-panel [--edge:transparent]",
  success: "bg-correct text-white [--edge:transparent]",
  danger: "bg-wrong text-white [--edge:transparent]",
  secondary: "bg-surface text-ink border border-line-strong [--edge:var(--line)] hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-surface-2 [--edge:transparent] shadow-none",
  gem: "bg-gem text-white [--edge:transparent]",
  streak: "bg-streak text-white [--edge:transparent]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm rounded-[10px]",
  md: "h-11 px-5 text-[15px] rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

/** Class names for anything that should look like a Button (e.g. a Next <Link>). */
export function buttonClassName({
  variant = "primary",
  size = "md",
  block,
  disabled,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; disabled?: boolean; className?: string } = {}) {
  return cn(
    "pressable hover-lift inline-flex items-center justify-center gap-2 font-sans font-medium whitespace-nowrap select-none",
    sizes[size],
    disabled ? "border-0 bg-surface-2 text-muted [--edge:transparent]" : variants[variant],
    block && "w-full",
    className,
  );
}

/** Pressable button: quiet fill, scales slightly on press. Disabled state goes flat. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={buttonClassName({ variant, size, block, disabled, className })}
      {...props}
    />
  );
});
