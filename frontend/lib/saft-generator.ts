/**
 * SAF-T Norway v1.30 Generator
 * Standard Audit File for Tax - Norwegian Financial Data
 *
 * Compliant with Skatteetaten requirements for:
 * - Bokføringsloven § 13b
 * - SAF-T Financial schema version 1.30
 */

export interface SAFTCompany {
  organizationNumber: string;
  name: string;
  address: {
    streetName?: string;
    number?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  contact?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface SAFTAccount {
  accountId: string;
  accountDescription: string;
  standardAccountId: string; // NS 4102 mapping
  accountType: "GL" | "AR" | "AP"; // General Ledger, Accounts Receivable, Accounts Payable
  openingDebitBalance?: number;
  openingCreditBalance?: number;
  closingDebitBalance?: number;
  closingCreditBalance?: number;
}

export interface SAFTCustomer {
  customerId: string;
  name: string;
  organizationNumber?: string;
  address?: {
    streetName?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface SAFTSupplier {
  supplierId: string;
  name: string;
  organizationNumber?: string;
  address?: {
    streetName?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface SAFTTaxCode {
  taxCode: string;
  description: string;
  taxPercentage: number;
  country: string;
  standardTaxCode: string; // MVA-kode mapping
  taxType: "MVA" | "Ingen";
}

export interface SAFTTransactionLine {
  recordId: string;
  accountId: string;
  customerId?: string;
  supplierId?: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  taxCode?: string;
  taxAmount?: number;
  sourceDocumentId?: string;
}

export interface SAFTTransaction {
  transactionId: string;
  period: string; // YYYYMM
  transactionDate: string; // YYYY-MM-DD
  description: string;
  systemEntryDate: string; // YYYY-MM-DD
  glPostingDate: string; // YYYY-MM-DD
  lines: SAFTTransactionLine[];
}

export interface SAFTExportOptions {
  company: SAFTCompany;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  selectionStartDate: string;
  selectionEndDate: string;
  accounts: SAFTAccount[];
  customers: SAFTCustomer[];
  suppliers: SAFTSupplier[];
  taxCodes: SAFTTaxCode[];
  transactions: SAFTTransaction[];
  softwareCompanyName: string;
  softwareId: string;
  softwareVersion: string;
}

/**
 * Escapes special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a number to SAF-T decimal format (2 decimal places, no thousands separator)
 */
function formatDecimal(value: number): string {
  return value.toFixed(2);
}

/**
 * Generates the SAF-T header section
 */
function generateHeader(options: SAFTExportOptions): string {
  const now = new Date();
  const dateCreated = now.toISOString().split("T")[0];
  const timeCreated = now.toTimeString().split(" ")[0];

  return `
  <Header>
    <AuditFileVersion>1.30</AuditFileVersion>
    <AuditFileCountry>NO</AuditFileCountry>
    <AuditFileDateCreated>${dateCreated}</AuditFileDateCreated>
    <SoftwareCompanyName>${escapeXml(options.softwareCompanyName)}</SoftwareCompanyName>
    <SoftwareID>${escapeXml(options.softwareId)}</SoftwareID>
    <SoftwareVersion>${escapeXml(options.softwareVersion)}</SoftwareVersion>
    <Company>
      <RegistrationNumber>${escapeXml(options.company.organizationNumber)}</RegistrationNumber>
      <Name>${escapeXml(options.company.name)}</Name>
      <Address>
        <StreetName>${escapeXml(options.company.address.streetName || "")}</StreetName>
        <Number>${escapeXml(options.company.address.number || "")}</Number>
        <PostalCode>${escapeXml(options.company.address.postalCode)}</PostalCode>
        <City>${escapeXml(options.company.address.city)}</City>
        <Country>${escapeXml(options.company.address.country)}</Country>
      </Address>
      ${options.company.contact ? `
      <Contact>
        <ContactPerson>
          <FirstName>${escapeXml(options.company.contact.name.split(" ")[0] || "")}</FirstName>
          <LastName>${escapeXml(options.company.contact.name.split(" ").slice(1).join(" ") || "")}</LastName>
        </ContactPerson>
        ${options.company.contact.phone ? `<Telephone>${escapeXml(options.company.contact.phone)}</Telephone>` : ""}
        ${options.company.contact.email ? `<Email>${escapeXml(options.company.contact.email)}</Email>` : ""}
      </Contact>` : ""}
      <TaxRegistration>
        <TaxRegistrationNumber>${escapeXml(options.company.organizationNumber)}MVA</TaxRegistrationNumber>
        <TaxType>MVA</TaxType>
      </TaxRegistration>
    </Company>
    <DefaultCurrencyCode>NOK</DefaultCurrencyCode>
    <SelectionCriteria>
      <SelectionStartDate>${options.selectionStartDate}</SelectionStartDate>
      <SelectionEndDate>${options.selectionEndDate}</SelectionEndDate>
    </SelectionCriteria>
    <HeaderComment>Generert av Ciri AI Regnskapssystem</HeaderComment>
  </Header>`;
}

/**
 * Generates the GeneralLedgerAccounts section
 */
function generateAccounts(accounts: SAFTAccount[]): string {
  const accountsXml = accounts
    .map(
      (acc) => `
      <Account>
        <AccountID>${escapeXml(acc.accountId)}</AccountID>
        <AccountDescription>${escapeXml(acc.accountDescription)}</AccountDescription>
        <StandardAccountID>${escapeXml(acc.standardAccountId)}</StandardAccountID>
        <AccountType>${acc.accountType}</AccountType>
        ${acc.openingDebitBalance !== undefined ? `<OpeningDebitBalance>${formatDecimal(acc.openingDebitBalance)}</OpeningDebitBalance>` : ""}
        ${acc.openingCreditBalance !== undefined ? `<OpeningCreditBalance>${formatDecimal(acc.openingCreditBalance)}</OpeningCreditBalance>` : ""}
        ${acc.closingDebitBalance !== undefined ? `<ClosingDebitBalance>${formatDecimal(acc.closingDebitBalance)}</ClosingDebitBalance>` : ""}
        ${acc.closingCreditBalance !== undefined ? `<ClosingCreditBalance>${formatDecimal(acc.closingCreditBalance)}</ClosingCreditBalance>` : ""}
      </Account>`
    )
    .join("");

  return `
    <GeneralLedgerAccounts>
      ${accountsXml}
    </GeneralLedgerAccounts>`;
}

/**
 * Generates the Customers section
 */
function generateCustomers(customers: SAFTCustomer[]): string {
  if (customers.length === 0) return "";

  const customersXml = customers
    .map(
      (cust) => `
      <Customer>
        <CustomerID>${escapeXml(cust.customerId)}</CustomerID>
        <Name>${escapeXml(cust.name)}</Name>
        ${cust.organizationNumber ? `<RegistrationNumber>${escapeXml(cust.organizationNumber)}</RegistrationNumber>` : ""}
        ${cust.address ? `
        <Address>
          <StreetName>${escapeXml(cust.address.streetName || "")}</StreetName>
          <PostalCode>${escapeXml(cust.address.postalCode || "")}</PostalCode>
          <City>${escapeXml(cust.address.city || "")}</City>
          <Country>${escapeXml(cust.address.country || "NO")}</Country>
        </Address>` : ""}
        ${cust.contact ? `
        <Contact>
          ${cust.contact.name ? `<ContactPerson><FirstName>${escapeXml(cust.contact.name)}</FirstName></ContactPerson>` : ""}
          ${cust.contact.phone ? `<Telephone>${escapeXml(cust.contact.phone)}</Telephone>` : ""}
          ${cust.contact.email ? `<Email>${escapeXml(cust.contact.email)}</Email>` : ""}
        </Contact>` : ""}
      </Customer>`
    )
    .join("");

  return `
    <Customers>
      ${customersXml}
    </Customers>`;
}

/**
 * Generates the Suppliers section
 */
function generateSuppliers(suppliers: SAFTSupplier[]): string {
  if (suppliers.length === 0) return "";

  const suppliersXml = suppliers
    .map(
      (supp) => `
      <Supplier>
        <SupplierID>${escapeXml(supp.supplierId)}</SupplierID>
        <Name>${escapeXml(supp.name)}</Name>
        ${supp.organizationNumber ? `<RegistrationNumber>${escapeXml(supp.organizationNumber)}</RegistrationNumber>` : ""}
        ${supp.address ? `
        <Address>
          <StreetName>${escapeXml(supp.address.streetName || "")}</StreetName>
          <PostalCode>${escapeXml(supp.address.postalCode || "")}</PostalCode>
          <City>${escapeXml(supp.address.city || "")}</City>
          <Country>${escapeXml(supp.address.country || "NO")}</Country>
        </Address>` : ""}
      </Supplier>`
    )
    .join("");

  return `
    <Suppliers>
      ${suppliersXml}
    </Suppliers>`;
}

/**
 * Generates the TaxTable section
 */
function generateTaxTable(taxCodes: SAFTTaxCode[]): string {
  const taxEntriesXml = taxCodes
    .map(
      (tax) => `
      <TaxTableEntry>
        <TaxType>${escapeXml(tax.taxType)}</TaxType>
        <TaxCode>${escapeXml(tax.taxCode)}</TaxCode>
        <Description>${escapeXml(tax.description)}</Description>
        <TaxPercentage>${formatDecimal(tax.taxPercentage)}</TaxPercentage>
        <Country>${escapeXml(tax.country)}</Country>
        <StandardTaxCode>${escapeXml(tax.standardTaxCode)}</StandardTaxCode>
      </TaxTableEntry>`
    )
    .join("");

  return `
    <TaxTable>
      ${taxEntriesXml}
    </TaxTable>`;
}

/**
 * Generates the MasterFiles section
 */
function generateMasterFiles(options: SAFTExportOptions): string {
  return `
  <MasterFiles>
    ${generateAccounts(options.accounts)}
    ${generateCustomers(options.customers)}
    ${generateSuppliers(options.suppliers)}
    ${generateTaxTable(options.taxCodes)}
  </MasterFiles>`;
}

/**
 * Generates the GeneralLedgerEntries section
 */
function generateGeneralLedgerEntries(
  transactions: SAFTTransaction[],
  periodStart: string,
  periodEnd: string
): string {
  // Calculate totals
  let totalDebit = 0;
  let totalCredit = 0;

  transactions.forEach((trans) => {
    trans.lines.forEach((line) => {
      totalDebit += line.debitAmount || 0;
      totalCredit += line.creditAmount || 0;
    });
  });

  const journalXml = `
    <Journal>
      <JournalID>GL</JournalID>
      <Description>Hovedbok</Description>
      <Type>GL</Type>
      ${transactions
        .map(
          (trans, idx) => `
      <Transaction>
        <TransactionID>${escapeXml(trans.transactionId)}</TransactionID>
        <Period>${escapeXml(trans.period)}</Period>
        <TransactionDate>${trans.transactionDate}</TransactionDate>
        <Description>${escapeXml(trans.description)}</Description>
        <SystemEntryDate>${trans.systemEntryDate}</SystemEntryDate>
        <GLPostingDate>${trans.glPostingDate}</GLPostingDate>
        ${trans.lines
          .map(
            (line, lineIdx) => `
        <Line>
          <RecordID>${escapeXml(line.recordId)}</RecordID>
          <AccountID>${escapeXml(line.accountId)}</AccountID>
          ${line.customerId ? `<CustomerID>${escapeXml(line.customerId)}</CustomerID>` : ""}
          ${line.supplierId ? `<SupplierID>${escapeXml(line.supplierId)}</SupplierID>` : ""}
          <Description>${escapeXml(line.description)}</Description>
          ${line.debitAmount !== undefined && line.debitAmount > 0 ? `<DebitAmount><Amount>${formatDecimal(line.debitAmount)}</Amount><CurrencyCode>NOK</CurrencyCode><CurrencyAmount>${formatDecimal(line.debitAmount)}</CurrencyAmount></DebitAmount>` : ""}
          ${line.creditAmount !== undefined && line.creditAmount > 0 ? `<CreditAmount><Amount>${formatDecimal(line.creditAmount)}</Amount><CurrencyCode>NOK</CurrencyCode><CurrencyAmount>${formatDecimal(line.creditAmount)}</CurrencyAmount></CreditAmount>` : ""}
          ${line.taxCode ? `<TaxInformation><TaxType>MVA</TaxType><TaxCode>${escapeXml(line.taxCode)}</TaxCode>${line.taxAmount !== undefined ? `<TaxAmount><Amount>${formatDecimal(line.taxAmount)}</Amount><CurrencyCode>NOK</CurrencyCode><CurrencyAmount>${formatDecimal(line.taxAmount)}</CurrencyAmount></TaxAmount>` : ""}</TaxInformation>` : ""}
          ${line.sourceDocumentId ? `<SourceDocumentID>${escapeXml(line.sourceDocumentId)}</SourceDocumentID>` : ""}
        </Line>`
          )
          .join("")}
      </Transaction>`
        )
        .join("")}
    </Journal>`;

  return `
  <GeneralLedgerEntries>
    <NumberOfEntries>${transactions.length}</NumberOfEntries>
    <TotalDebit>${formatDecimal(totalDebit)}</TotalDebit>
    <TotalCredit>${formatDecimal(totalCredit)}</TotalCredit>
    ${journalXml}
  </GeneralLedgerEntries>`;
}

/**
 * Main function to generate complete SAF-T XML file
 */
export function generateSAFTXML(options: SAFTExportOptions): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:StandardAuditFile-Taxation-Financial:NO" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:StandardAuditFile-Taxation-Financial:NO Norwegian_SAF-T_Financial_Schema_v1.30.xsd">
${generateHeader(options)}
${generateMasterFiles(options)}
${generateGeneralLedgerEntries(options.transactions, options.periodStart, options.periodEnd)}
</AuditFile>`;

  return xml.replace(/^\s*[\r\n]/gm, ""); // Remove empty lines
}

/**
 * Downloads the SAF-T file
 */
export function downloadSAFTFile(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates SAF-T data before export
 */
export interface SAFTValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSAFTData(options: SAFTExportOptions): SAFTValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!options.company.organizationNumber) {
    errors.push("Organisasjonsnummer er påkrevd");
  } else if (!/^\d{9}$/.test(options.company.organizationNumber)) {
    errors.push("Organisasjonsnummer må være 9 siffer");
  }

  if (!options.company.name) {
    errors.push("Firmanavn er påkrevd");
  }

  if (!options.company.address.postalCode) {
    errors.push("Postnummer er påkrevd");
  }

  if (!options.company.address.city) {
    errors.push("By/sted er påkrevd");
  }

  // Account validation
  if (options.accounts.length === 0) {
    errors.push("Minst én konto må være definert");
  }

  options.accounts.forEach((acc) => {
    if (!acc.standardAccountId) {
      warnings.push(`Konto ${acc.accountId} mangler NS 4102 mapping`);
    }
  });

  // Transaction validation
  options.transactions.forEach((trans) => {
    let totalDebit = 0;
    let totalCredit = 0;

    trans.lines.forEach((line) => {
      totalDebit += line.debitAmount || 0;
      totalCredit += line.creditAmount || 0;
    });

    // Check if transaction balances
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push(`Transaksjon ${trans.transactionId} balanserer ikke (Debet: ${totalDebit}, Kredit: ${totalCredit})`);
    }
  });

  // Tax code validation
  if (options.taxCodes.length === 0) {
    warnings.push("Ingen MVA-koder definert");
  }

  // Customer/Supplier org number validation
  options.customers.forEach((cust) => {
    if (!cust.organizationNumber) {
      warnings.push(`Kunde ${cust.name} mangler organisasjonsnummer`);
    }
  });

  options.suppliers.forEach((supp) => {
    if (!supp.organizationNumber) {
      warnings.push(`Leverandør ${supp.name} mangler organisasjonsnummer`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
