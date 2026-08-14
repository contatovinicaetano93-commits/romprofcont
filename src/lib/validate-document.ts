import type { ValidacaoItem } from "@/lib/types";
import { normalizeCnpj } from "@/lib/types";
import type { ExtractedDoc } from "@/lib/extract-document-fields";
import {
  extractFromContent,
  extractFromXml,
  extractValorFromText,
  guessTipoFromText,
  extractBestCnpj,
} from "@/lib/extract-document-fields";

type Profissional = {
  id: string;
  name: string;
  cnpj: string | null;
  contabilidadeId: string;
  unidade: string | null;
};

type Obrigacao = {
  id: string;
  profissionalId: string;
  tipo: string | null;
  valorEsperado: string | null;
  regras: string | null;
};

function parseTolerance(regras: string | null | undefined) {
  const match = (regras ?? "").match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) / 100 : 0.05;
}

export function validateDocument(
  extracted: ExtractedDoc,
  profissionais: Profissional[],
  obrigacoes: Obrigacao[],
) {
  const validacoes: ValidacaoItem[] = [];
  const cnpj = extracted.cnpj ? normalizeCnpj(extracted.cnpj) : "";

  const profissional = profissionais.find(
    (p) => p.cnpj && normalizeCnpj(p.cnpj) === cnpj,
  );

  if (!cnpj) {
    validacoes.push({
      check: "CNPJ",
      detail: "CNPJ não encontrado no documento",
      result: "DIVERGÊNCIA",
    });
  } else if (!profissional) {
    validacoes.push({
      check: "CNPJ",
      detail: `CNPJ ${extracted.cnpj} não cadastrado na Base Mestre`,
      result: "DIVERGÊNCIA",
    });
  } else {
    validacoes.push({
      check: "CNPJ",
      detail: `Profissional: ${profissional.name}`,
      result: "OK",
    });
  }

  const tipo = extracted.tipo ?? "Outros";
  const obrigacao = profissional
    ? obrigacoes.find(
        (o) =>
          o.profissionalId === profissional.id &&
          (o.tipo ?? "").toLowerCase() === tipo.toLowerCase(),
      )
    : undefined;

  if (profissional && !obrigacao) {
    validacoes.push({
      check: "Obrigação",
      detail: `Tipo ${tipo} não cadastrado para este profissional`,
      result: "DIVERGÊNCIA",
    });
  } else if (obrigacao) {
    validacoes.push({
      check: "Obrigação",
      detail: `${obrigacao.tipo} — esperado ${obrigacao.valorEsperado ?? "0"}`,
      result: "OK",
    });
  }

  const valorEsperado = parseFloat(obrigacao?.valorEsperado ?? "0");
  const valorDoc = extracted.valor ?? 0;
  const tolerance = parseTolerance(obrigacao?.regras);

  if (obrigacao && valorDoc > 0) {
    const diff = Math.abs(valorDoc - valorEsperado);
    const pct = valorEsperado > 0 ? diff / valorEsperado : 1;
    const within = pct <= tolerance;
    validacoes.push({
      check: "Valor",
      detail: `Documento ${valorDoc.toFixed(2)} vs esperado ${valorEsperado.toFixed(2)} (tol. ${(tolerance * 100).toFixed(0)}%)`,
      result: within ? "OK" : "DIVERGÊNCIA",
    });
  }

  if (extracted.competencia) {
    validacoes.push({
      check: "Competência",
      detail: extracted.competencia,
      result: "OK",
    });
  }

  let status: "aprovado" | "pendente_validacao" | "reprovado" | "nao_identificado" =
    "pendente_validacao";
  let motivo = "Aguardando validação";
  let acaoNecessaria = "Revisar documento";

  if (!profissional) {
    status = "nao_identificado";
    motivo = "CNPJ não identificado na Base Mestre";
    acaoNecessaria = "Cadastrar profissional ou corrigir CNPJ";
  } else {
    const hasDivergencia = validacoes.some((v) => v.result === "DIVERGÊNCIA");
    const allOk = validacoes.every((v) => v.result === "OK");

    if (allOk && !hasDivergencia) {
      status = "aprovado";
      motivo = "Validação automática aprovada";
      acaoNecessaria = "Nenhuma";
    } else if (hasDivergencia) {
      status = "pendente_validacao";
      motivo = "Divergência encontrada na validação automática";
      acaoNecessaria = "Analista deve revisar e aprovar ou reprovar";
    }
  }

  return {
    status,
    motivo,
    acaoNecessaria,
    validacoes,
    profissional,
    obrigacao,
    tipo,
    competencia: extracted.competencia ?? "",
    valor: valorDoc,
    cnpj: extracted.cnpj ?? "",
    unidade: profissional?.unidade ?? null,
    contabilidadeId: profissional?.contabilidadeId ?? null,
    obrigacaoId: obrigacao?.id ?? null,
    profissionalId: profissional?.id ?? null,
  };
}

export {
  extractFromContent,
  extractFromXml,
  extractValorFromText,
  guessTipoFromText,
};

export function extractCnpjFromText(text: string) {
  return extractBestCnpj(text);
}
