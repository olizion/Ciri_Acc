import MarketingNav from "@/components/marketing/marketing-nav";
import MarketingFooter from "@/components/marketing/marketing-footer";

export default function ProduktLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white text-[#1a2e23]"
      style={{ fontFamily: "var(--font-hedvig-letters-serif), Georgia, serif" }}
    >
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
