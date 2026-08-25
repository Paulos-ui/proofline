import { MarketingHeader, MarketingFooter } from "@/components/marketing/Chrome";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </>
  );
}
