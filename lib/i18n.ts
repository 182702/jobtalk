// Customer-facing invoice wording in English and Spanish.
export type InvoiceLanguage = "en" | "es";

export function invoiceLang(value: unknown): InvoiceLanguage {
  return value === "es" ? "es" : "en";
}

type Strings = {
  invoice: string;
  billTo: string;
  customer: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
  subtotal: string;
  tax: string;
  totalDue: string;
  notes: string;
  howToPay: string;
  paid: string;
  madeWith: string;
  yourBusiness: string;
  viewInvoice: string;
  downloadPdf: string;
  invoiceFor: (number: string, customer: string, date: string) => string;
  emailSubject: (number: string, business: string) => string;
  emailGreeting: (name: string) => string;
  emailBody: (number: string, business: string, total: string) => string;
  emailAttached: string;
  emailThanks: string;
  pdfName: string;
  dateLocale: string;
  signatures: string;
  signStatement: Record<"approve" | "complete", string>;
  signTitle: Record<"approve" | "complete", string>;
  signedBy: (name: string, date: string) => string;
  yourName: string;
  signHere: string;
  clearSignature: string;
  sign: string;
  cancel: string;
  signMissing: string;
};

export const INVOICE_STRINGS: Record<InvoiceLanguage, Strings> = {
  en: {
    invoice: "Invoice",
    billTo: "Bill to",
    customer: "Customer",
    item: "Item",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    subtotal: "Subtotal",
    tax: "Tax",
    totalDue: "Total due",
    notes: "Notes",
    howToPay: "How to pay",
    paid: "Paid",
    madeWith: "Made with VoiceBill Pro",
    yourBusiness: "Your Business",
    viewInvoice: "View invoice",
    downloadPdf: "Download PDF",
    invoiceFor: (n, c, d) => `Invoice ${n} for ${c} · ${d}`,
    emailSubject: (n, b) => `Invoice ${n} from ${b}`,
    emailGreeting: (name) => `Hi ${name || "there"},`,
    emailBody: (n, b, t) => `Here is invoice ${n} from ${b} for <b>${t}</b>.`,
    emailAttached: "The PDF is attached.",
    emailThanks: "Thanks,",
    pdfName: "invoice",
    dateLocale: "en-US",
    signatures: "Signatures",
    signStatement: {
      approve: "Approved: I agree to the work and prices on this invoice.",
      complete: "Work complete: the work is done and I'm satisfied with it.",
    },
    signTitle: { approve: "Approve this invoice", complete: "Confirm the work is done" },
    signedBy: (name, date) => `Signed by ${name} · ${date}`,
    yourName: "Your name",
    signHere: "Sign here with your finger",
    clearSignature: "Clear",
    sign: "Sign",
    cancel: "Cancel",
    signMissing: "Please write your name and sign.",
  },
  es: {
    invoice: "Factura",
    billTo: "Facturar a",
    customer: "Cliente",
    item: "Concepto",
    qty: "Cant.",
    rate: "Precio",
    amount: "Importe",
    subtotal: "Subtotal",
    tax: "Impuesto",
    totalDue: "Total a pagar",
    notes: "Notas",
    howToPay: "Cómo pagar",
    paid: "Pagada",
    madeWith: "Hecho con VoiceBill Pro",
    yourBusiness: "Su negocio",
    viewInvoice: "Ver factura",
    downloadPdf: "Descargar PDF",
    invoiceFor: (n, c, d) => `Factura ${n} para ${c} · ${d}`,
    emailSubject: (n, b) => `Factura ${n} de ${b}`,
    emailGreeting: (name) => (name ? `Hola ${name}:` : "Hola:"),
    emailBody: (n, b, t) => `Le enviamos la factura ${n} de ${b} por <b>${t}</b>.`,
    emailAttached: "El PDF va adjunto.",
    emailThanks: "Gracias,",
    pdfName: "factura",
    dateLocale: "es-US",
    signatures: "Firmas",
    signStatement: {
      approve: "Aprobado: estoy de acuerdo con el trabajo y los precios de esta factura.",
      complete: "Trabajo terminado: el trabajo está hecho y estoy satisfecho.",
    },
    signTitle: { approve: "Aprobar esta factura", complete: "Confirmar que el trabajo está hecho" },
    signedBy: (name, date) => `Firmado por ${name} · ${date}`,
    yourName: "Su nombre",
    signHere: "Firme aquí con su dedo",
    clearSignature: "Borrar",
    sign: "Firmar",
    cancel: "Cancelar",
    signMissing: "Escriba su nombre y firme.",
  },
};

export function t(lang: unknown): Strings {
  return INVOICE_STRINGS[invoiceLang(lang)];
}
