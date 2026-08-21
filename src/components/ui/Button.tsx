import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "dark";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-pulse-600 text-white shadow-sm hover:bg-pulse-700 active:bg-pulse-800",
  secondary: "bg-ink-800 text-white hover:bg-ink-900 active:bg-ink-950",
  outline:
    "border border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-100 active:bg-ink-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  success: "bg-live-600 text-white hover:bg-live-700 active:bg-live-800",
  dark: "bg-ink-950 text-white hover:bg-ink-800 active:bg-ink-900",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8.5 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11.5 px-6 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, icon, iconRight, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});