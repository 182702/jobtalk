"use client";

import { useState } from "react";
import { translator, type UiLang } from "@/lib/ui";

/** "For your taxes": download a year of invoices as a spreadsheet or one PDF. */
export function TaxExport({ years, lang }: { years: number[]; lang: UiLang }) {
  const T = translator(lang);
  const [year, setYear] = useState(years[0]);
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2 style={{ marginTop: 0 }}>{T("For your taxes")}</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        {T("Download every invoice for a year. Estimates are left out. The spreadsheet opens in Excel or Google Sheets and has totals at the bottom.")}
      </p>
      <div className="field">
        <label htmlFor="tax-year">{T("Year")}</label>
        <select id="tax-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="btns">
        <a className="btn alt" href={`/api/invoices/export?year=${year}&format=csv`} download>
          {T("📊 Spreadsheet (CSV)")}
        </a>
        <a className="btn alt" href={`/api/invoices/export?year=${year}&format=pdf`} download>
          {T("📄 All invoices (PDF)")}
        </a>
      </div>
    </div>
  );
}
