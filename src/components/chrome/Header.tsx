"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { nav } from "@/lib/site";
import { cn } from "@/lib/cn";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Home opens on the white hero; every interior route opens on a
  // petrol band. The unscrolled header adapts to whichever it sits on.
  const darkTop = !scrolled && pathname !== "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500",
          scrolled
            ? "border-b border-line bg-canvas/88 backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-18 max-w-[1400px] items-center gap-8 px-5 sm:px-8">
          <Link
            href="/"
            aria-label="Breakpoint — home"
            className={cn(
              "transition-colors duration-500",
              darkTop ? "text-cream" : "text-ink",
            )}
          >
            <Logo />
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[0.9375rem] transition-colors duration-300",
                    darkTop
                      ? active
                        ? "text-cream"
                        : "text-cream-soft hover:text-cream"
                      : active
                        ? "text-petrol-800"
                        : "text-ink-soft hover:text-petrol-800",
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-brass-500"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link
              href="/demo"
              className={cn(
                "hidden items-center rounded-full px-5 py-2.5 text-[0.9375rem] font-medium transition-colors duration-500 sm:inline-flex",
                darkTop
                  ? "bg-cream text-petrol-950 hover:bg-white"
                  : "bg-petrol-800 text-cream hover:bg-petrol-700",
              )}
            >
              Start your evaluation
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className={cn(
                "relative z-50 grid h-11 w-11 place-items-center rounded-full transition-colors duration-300 lg:hidden",
                open
                  ? "text-cream"
                  : darkTop
                    ? "text-cream hover:bg-white/10"
                    : "text-ink hover:bg-surface-sunk",
              )}
            >
              <span className="flex h-4 w-5 flex-col justify-between">
                <motion.span
                  animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-0.5 w-full origin-center bg-current"
                />
                <motion.span
                  animate={open ? { opacity: 0 } : { opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="block h-0.5 w-full bg-current"
                />
                <motion.span
                  animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-0.5 w-full origin-center bg-current"
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 z-40 bg-petrol-900 lg:hidden"
          >
            <div aria-hidden className="pointer-events-none absolute -right-[20%] -top-[15%] h-[24rem] w-[24rem] rounded-full bg-petrol-600/25 blur-[100px]" />
            <nav className="relative flex h-full flex-col justify-center gap-1 px-6 pb-24">
              {nav.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06 + i * 0.045,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={item.href}
                    className="font-display block border-b border-white/12 py-4 text-[1.875rem] text-cream"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8"
              >
                <Link
                  href="/demo"
                  className="flex w-full items-center justify-center rounded-full bg-brass-500 px-6 py-4 text-base font-medium text-petrol-950"
                >
                  Start your evaluation
                </Link>
                <p className="mt-4 text-center text-sm text-cream-faint">
                  Your first center goes live in 24–48 hours.
                </p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
