import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getPdfThemeColors } from "@/lib/ciri-theme";
import { KontoKlasse, Totals } from "./types";
import { formatNumber } from "./utils";

export async function exportToExcel(
  filteredKontoer: KontoKlasse[],
  totals: Totals,
  dateRange: { from: Date; to: Date },
  dateRangeDisplay: string
) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["HOVEDBOK - CIRI REGNSKAP"],
    [],
    ["Periode:", dateRangeDisplay],
    ["Generert:", format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })],
    [],
    ["SAMMENDRAG"],
    ["Total Debet", totals.totalDebet],
    ["Total Kredit", totals.totalKredit],
    ["Differanse", totals.differanse],
    ["Antall kontoer", totals.kontoCount],
    ["Antall transaksjoner", totals.transaksjonCount],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Sammendrag");

  const accountsHeader = ["Kontonr", "Kontonavn", "Klasse", "IB", "Debet", "Kredit", "UB"];
  const accountsData: (string | number)[][] = [accountsHeader];

  filteredKontoer.forEach(klasse => {
    accountsData.push([`--- ${klasse.nummer}xxx ${klasse.navn} ---`, "", "", "", "", "", ""]);

    klasse.kontoer.forEach(konto => {
      accountsData.push([
        konto.kontonummer,
        konto.kontonavn,
        konto.klasse,
        konto.inngaendeBalanse,
        konto.debet,
        konto.kredit,
        konto.utgaendeBalanse,
      ]);
    });
  });

  accountsData.push([]);
  accountsData.push(["TOTALT", "", "", "", totals.totalDebet, totals.totalKredit, totals.differanse]);

  const accountsSheet = XLSX.utils.aoa_to_sheet(accountsData);
  accountsSheet["!cols"] = [
    { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, accountsSheet, "Kontooversikt");

  const transHeader = ["Konto", "Kontonavn", "Dato", "Bilagsnr", "Beskrivelse", "Debet", "Kredit", "Motpart"];
  const transData: (string | number)[][] = [transHeader];

  filteredKontoer.forEach(klasse => {
    klasse.kontoer.forEach(konto => {
      konto.transaksjoner.forEach(trans => {
        transData.push([
          konto.kontonummer,
          konto.kontonavn,
          trans.dato,
          trans.bilagsnummer,
          trans.beskrivelse,
          trans.debet || 0,
          trans.kredit || 0,
          trans.motpart,
        ]);
      });
    });
  });

  const transSheet = XLSX.utils.aoa_to_sheet(transData);
  transSheet["!cols"] = [
    { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, transSheet, "Transaksjoner");

  const filename = `hovedbok_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export async function downloadPDF(
  filteredKontoer: KontoKlasse[],
  totals: Totals,
  dateRange: { from: Date; to: Date },
  dateRangeDisplay: string
) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const THEME = getPdfThemeColors();

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica",
    },
    header: {
      marginBottom: 20,
      borderBottom: `2px solid ${THEME.primary}`,
      paddingBottom: 15,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: THEME.primary,
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 12,
      color: "#6b7280",
    },
    periodBadge: {
      marginTop: 8,
      padding: "4px 8px",
      backgroundColor: THEME.bgLight,
      borderRadius: 4,
      fontSize: 10,
      color: "#374151",
      alignSelf: "flex-start",
    },
    summarySection: {
      marginBottom: 25,
      padding: 15,
      backgroundColor: THEME.bgAccent,
      borderRadius: 8,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: THEME.primary,
      marginBottom: 12,
    },
    summaryGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryItem: {
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 9,
      color: "#6b7280",
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: "bold",
    },
    debet: {
      color: "#059669",
    },
    kredit: {
      color: "#dc2626",
    },
    balanced: {
      color: "#059669",
    },
    unbalanced: {
      color: "#d97706",
    },
    table: {
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: THEME.primary,
      padding: 8,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    tableHeaderText: {
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 9,
    },
    tableRow: {
      flexDirection: "row",
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
    },
    tableRowAlt: {
      backgroundColor: THEME.bgLight,
    },
    classHeader: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: THEME.bgAccent,
      marginTop: 8,
    },
    classHeaderText: {
      fontWeight: "bold",
      color: THEME.primaryDark,
      fontSize: 10,
    },
    col1: { width: "12%" },
    col2: { width: "28%" },
    col3: { width: "15%", textAlign: "right" },
    col4: { width: "15%", textAlign: "right" },
    col5: { width: "15%", textAlign: "right" },
    col6: { width: "15%", textAlign: "right" },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      borderTop: "1px solid #e5e7eb",
      paddingTop: 10,
      fontSize: 8,
      color: "#9ca3af",
    },
    pageNumber: {
      position: "absolute",
      bottom: 30,
      right: 40,
      fontSize: 8,
      color: "#9ca3af",
    },
  });

  const HovedboKPDF = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Hovedbok</Text>
          <Text style={styles.subtitle}>Ciri Regnskap</Text>
          <View style={styles.periodBadge}>
            <Text>{dateRangeDisplay}</Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Sammendrag</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Debet</Text>
              <Text style={[styles.summaryValue, styles.debet]}>
                kr {formatNumber(totals.totalDebet)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Kredit</Text>
              <Text style={[styles.summaryValue, styles.kredit]}>
                kr {formatNumber(totals.totalKredit)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Differanse</Text>
              <Text style={[styles.summaryValue, totals.differanse === 0 ? styles.balanced : styles.unbalanced]}>
                kr {formatNumber(totals.differanse)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Kontoer</Text>
              <Text style={styles.summaryValue}>{totals.kontoCount}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transaksjoner</Text>
              <Text style={styles.summaryValue}>{totals.transaksjonCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Konto</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Kontonavn</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>IB</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Debet</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>Kredit</Text>
            <Text style={[styles.tableHeaderText, styles.col6]}>UB</Text>
          </View>

          {filteredKontoer.map((klasse, ki) => (
            <View key={klasse.nummer}>
              <View style={styles.classHeader}>
                <Text style={styles.classHeaderText}>
                  {klasse.nummer}xxx - {klasse.navn}
                </Text>
              </View>
              {klasse.kontoer.map((konto, i) => (
                <View key={konto.kontonummer} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                  <Text style={styles.col1}>{konto.kontonummer}</Text>
                  <Text style={styles.col2}>{konto.kontonavn}</Text>
                  <Text style={styles.col3}>{formatNumber(konto.inngaendeBalanse)}</Text>
                  <Text style={[styles.col4, styles.debet]}>{konto.debet > 0 ? formatNumber(konto.debet) : "-"}</Text>
                  <Text style={[styles.col5, styles.kredit]}>{konto.kredit > 0 ? formatNumber(konto.kredit) : "-"}</Text>
                  <Text style={styles.col6}>{formatNumber(konto.utgaendeBalanse)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>Generert av Ciri • {format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );

  const blob = await pdf(<HovedboKPDF />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hovedbok_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
