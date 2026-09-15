import ExcelJS from "exceljs";
import {
  CONFERENCIA_HEADERS,
  conferenciaFileName,
  sheetNameForCompetencia,
  type ConferenciaRow,
} from "@/lib/conferencia-export";

export async function writeConferenciaXlsx(
  rows: ConferenciaRow[],
  competencia: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "romprofcont";
  const sheet = workbook.addWorksheet(sheetNameForCompetencia(competencia), {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  sheet.mergeCells("A1:L1");
  const title = sheet.getCell("A1");
  title.value = "CONSOLIDAÇÃO GERAL";
  title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E79" },
  };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 22;

  const header = sheet.addRow([...CONFERENCIA_HEADERS]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  header.height = 28;

  for (const row of rows) {
    sheet.addRow([
      row.profissional,
      row.cnpj,
      row.unidade,
      row.contabilidade,
      row.valorMensalidade,
      row.dasMeiSimples,
      row.valorDas,
      row.darfInss,
      row.parcelamento,
      row.valorParcelamento,
      row.situacao,
      row.financeiro,
    ]);
  }

  sheet.columns = [
    { width: 42 },
    { width: 22 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
    { width: 24 },
  ];

  const moneyCols = [5, 7, 8, 10];
  for (let r = 3; r <= rows.length + 2; r += 1) {
    for (const col of moneyCols) {
      const cell = sheet.getRow(r).getCell(col);
      if (typeof cell.value === "number") {
        cell.numFmt = '#,##0.00';
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    fileName: conferenciaFileName(competencia),
  };
}
