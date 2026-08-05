import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";

/**
 * Marketing chrome.
 *
 * The workspace, the onboarding wizard and the lock screen deliberately
 * sit outside this group. Gating the footer on the client was not
 * enough: the marketing footer was still server-rendered into every
 * product page and only removed on hydration, which flashed a footer
 * inside the app and fetched its poster image for nothing. A route
 * group settles it at the layout level, where it belongs.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
