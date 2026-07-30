import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "onDark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-petrol-800 text-cream hover:bg-petrol-700 hover:shadow-[0_10px_30px_-12px_rgba(14,74,66,0.6)]",
  secondary:
    "border border-line bg-surface text-ink hover:border-petrol-300 hover:bg-petrol-50",
  ghost: "text-ink hover:bg-surface-sunk",
  onDark: "bg-cream text-petrol-900 hover:bg-white",
};

const sizes = {
  md: "px-6 py-3 text-[0.9375rem]",
  lg: "px-7 py-4 text-base",
};

export function Button({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
