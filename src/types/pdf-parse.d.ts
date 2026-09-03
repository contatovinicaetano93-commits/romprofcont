declare module "pdf-parse" {
  type PdfData = {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  };

  export default function pdfParse(data: Buffer | Uint8Array): Promise<PdfData>;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  export { default } from "pdf-parse";
}

