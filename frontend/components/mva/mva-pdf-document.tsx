"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Disable hyphenation to avoid loading external resources
Font.registerHyphenationCallback((word) => [word]);

// Disable emoji source to prevent font loading errors
Font.registerEmojiSource({
  format: "png",
  url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/",
});

// Use built-in Helvetica font - no custom font registration needed

// Nordic Sage / Ciri theme colors
// Based on: Deep Teal #3E715C, Jungle Teal #5B906F, Muted Olive #9AAD83, Dry Sage #CFCEA1, Ash Grey #96AFA8
const colors = {
  primary: "#3E715C", // Deep Teal - primary-600
  primaryLight: "#5B906F", // Jungle Teal - primary-500
  secondary: "#9AAD83", // Muted Olive - secondary-400
  accent: "#96AFA8", // Ash Grey
  sage: "#CFCEA1", // Dry Sage
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#D4DDD0", // Sage-tinted border
  background: "#F5F7F4", // Light sage background
  white: "#FFFFFF",
  success: "#3E715C", // Use primary teal for success
  successLight: "#E8F0EC", // Light teal background
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    backgroundColor: colors.white,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 700,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: "right",
  },

  // Validation badge
  validationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  validationIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  validationCheckmark: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 700,
  },
  validationText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 500,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 10,
    color: colors.text,
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.text,
  },
  tableCellMono: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: "Courier",
  },

  // Column widths for MVA table
  colCode: { width: "12%" },
  colDescription: { width: "48%" },
  colGrunnlag: { width: "20%", textAlign: "right" },
  colMva: { width: "20%", textAlign: "right" },

  // Summary box
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 16,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryRowLast: {
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.text,
  },
  summaryValueGreen: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.success,
  },
  summaryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.primary,
  },

  // Bilag details table columns
  colBilagDate: { width: "12%" },
  colBilagDesc: { width: "38%" },
  colBilagVendor: { width: "22%" },
  colBilagAmount: { width: "14%", textAlign: "right" },
  colBilagMva: { width: "14%", textAlign: "right" },

  // Income table columns
  colIncDate: { width: "12%" },
  colIncDesc: { width: "35%" },
  colIncCustomer: { width: "25%" },
  colIncAmount: { width: "14%", textAlign: "right" },
  colIncMva: { width: "14%", textAlign: "right" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLogoText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 700,
  },
  footerText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  footerRight: {
    fontSize: 8,
    color: colors.textMuted,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textMuted,
  },
});

// Types
export interface MVALine {
  code: string;
  description: string;
  grunnlag: number;
  mva: number;
}

export interface IncomeItem {
  id: string;
  date: string;
  description: string;
  customer: string;
  invoiceNo: string;
  amount: number;
  mvaRate: number;
  mva: number;
}

export interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  vendor: string;
  bilagNo: string;
  amount: number;
  mvaRate: number;
  mva: number;
  mvaCode: string;
}

export interface MVASummary {
  utgaende: number;
  inngaende: number;
  tilBetaling: number;
}

export interface CompanyInfo {
  name: string;
  orgNo: string;
  address?: string;
}

export interface MVAPDFData {
  termin: string;
  period: string;
  deadline: string;
  bilagCount: number;
  lines: MVALine[];
  summary: MVASummary;
  incomeData: IncomeItem[];
  expenseData: ExpenseItem[];
  company: CompanyInfo;
  generatedAt: Date;
}

// Format currency in Norwegian style
function formatCurrency(amount: number): string {
  return `kr ${amount.toLocaleString("nb-NO")}`;
}

// Format date in Norwegian style
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// MVA PDF Document Component
export function MVAPDFDocument({ data }: { data: MVAPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>MVA-melding</Text>
              <Text style={styles.headerSubtitle}>
                {data.termin} • {data.period}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={styles.companyInfo}>Org.nr: {data.company.orgNo}</Text>
            {data.company.address && (
              <Text style={styles.companyInfo}>{data.company.address}</Text>
            )}
            <Text style={styles.companyInfo}>Frist: {data.deadline}</Text>
          </View>
        </View>

        {/* Validation Badge */}
        <View style={styles.validationBadge}>
          <View style={styles.validationIcon}>
            <Text style={styles.validationCheckmark}>✓</Text>
          </View>
          <Text style={styles.validationText}>
            Validert mot SAF-T • {data.bilagCount} bilag kontrollert
          </Text>
        </View>

        {/* MVA-poster Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MVA-poster</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colCode]}>Kode</Text>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colGrunnlag]}>
                Grunnlag
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colMva]}>MVA</Text>
            </View>
            {data.lines.map((line, index) => (
              <View
                key={line.code}
                style={
                  index === data.lines.length - 1
                    ? [styles.tableRow, styles.tableRowLast]
                    : styles.tableRow
                }
              >
                <Text style={[styles.tableCellMono, styles.colCode]}>
                  {line.code}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {line.description}
                </Text>
                <Text style={[styles.tableCell, styles.colGrunnlag]}>
                  {formatCurrency(line.grunnlag)}
                </Text>
                <Text style={[styles.tableCellBold, styles.colMva]}>
                  {formatCurrency(line.mva)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Oppsummering</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Utgående MVA (du skylder)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.summary.utgaende)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inngående MVA (fradrag)</Text>
              <Text style={styles.summaryValueGreen}>
                - {formatCurrency(data.summary.inngaende)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={[styles.summaryTotal, styles.summaryRowLast]}>
              <Text style={styles.summaryTotalLabel}>Netto MVA å betale</Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrency(data.summary.tilBetaling)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <View style={styles.footerLogo}>
              <Text style={styles.footerLogoText}>C</Text>
            </View>
            <Text style={styles.footerText}>
              Generert av Ciri • {formatFullDate(data.generatedAt)}
            </Text>
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Side ${pageNumber} av ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2: Bilag Details */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Bilagsdetaljer</Text>
              <Text style={styles.headerSubtitle}>
                {data.termin} • {data.period}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text style={styles.companyInfo}>Org.nr: {data.company.orgNo}</Text>
          </View>
        </View>

        {/* Income Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Inntekter (Utgående MVA) - {data.incomeData.length} fakturaer
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colIncDate]}>
                Dato
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colIncDesc]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colIncCustomer]}>
                Kunde
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colIncAmount]}>
                Beløp
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colIncMva]}>
                MVA
              </Text>
            </View>
            {data.incomeData.map((item, index) => (
              <View
                key={item.id}
                style={
                  index === data.incomeData.length - 1
                    ? [styles.tableRow, styles.tableRowLast]
                    : styles.tableRow
                }
              >
                <Text style={[styles.tableCellMono, styles.colIncDate]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.tableCell, styles.colIncDesc]}>
                  {item.description.length > 35
                    ? item.description.substring(0, 35) + "..."
                    : item.description}
                </Text>
                <Text style={[styles.tableCell, styles.colIncCustomer]}>
                  {item.customer.length > 22
                    ? item.customer.substring(0, 22) + "..."
                    : item.customer}
                </Text>
                <Text style={[styles.tableCell, styles.colIncAmount]}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={[styles.tableCellBold, styles.colIncMva]}>
                  {formatCurrency(item.mva)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Expense Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Kostnader (Inngående MVA) - {data.expenseData.length} bilag
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colBilagDate]}>
                Dato
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colBilagDesc]}>
                Beskrivelse
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colBilagVendor]}>
                Leverandør
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colBilagAmount]}>
                Beløp
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colBilagMva]}>
                Fradrag
              </Text>
            </View>
            {data.expenseData.map((item, index) => (
              <View
                key={item.id}
                style={
                  index === data.expenseData.length - 1
                    ? [styles.tableRow, styles.tableRowLast]
                    : styles.tableRow
                }
              >
                <Text style={[styles.tableCellMono, styles.colBilagDate]}>
                  {formatDate(item.date)}
                </Text>
                <Text style={[styles.tableCell, styles.colBilagDesc]}>
                  {item.description.length > 32
                    ? item.description.substring(0, 32) + "..."
                    : item.description}
                </Text>
                <Text style={[styles.tableCell, styles.colBilagVendor]}>
                  {item.vendor.length > 20
                    ? item.vendor.substring(0, 20) + "..."
                    : item.vendor}
                </Text>
                <Text style={[styles.tableCell, styles.colBilagAmount]}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={[styles.tableCellBold, styles.colBilagMva]}>
                  {item.mvaCode === "1" && item.mva > 0
                    ? formatCurrency(item.mva)
                    : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <View style={styles.footerLogo}>
              <Text style={styles.footerLogoText}>C</Text>
            </View>
            <Text style={styles.footerText}>
              Generert av Ciri • {formatFullDate(data.generatedAt)}
            </Text>
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Side ${pageNumber} av ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
