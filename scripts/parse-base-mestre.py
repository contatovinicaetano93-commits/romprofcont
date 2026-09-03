#!/usr/bin/env python3
"""Parse Faturamento xlsx into Base Mestre JSON (stdout)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict

import openpyxl

UNIDADE_BY_SHEET = {
    "BRASIL": "ROM Brasil",
    "IGUATEMI": "ROM Iguatemi",
}

CONTABILIDADE_ALIASES = {
    "yamada": "YAMADA",
    "contbell": "CONTBELL",
    "sem cont": "SEM CONT",
    "vfmconsulting": "VFM Consulting",
    "jvrcontabil": "JVR Contábil",
    "bruno etecc": "Bruno Etecc",
    "primeiro acessoria": "Primeiro Acessoria",
    "leal gest": "Leal Gest",
    "assistec": "Assistec",
    "bertoni": "Bertoni",
    "caio orenga": "Caio Orenga",
    "paulo sergio": "Paulo Sergio",
    "veiga postal": "Veiga Postal",
}


def only_digits(value: object) -> str:
    return re.sub(r"\D", "", str(value or ""))


def format_cnpj(digits: str) -> str:
    if len(digits) != 14:
        return digits
    return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"


def clean_name(name: object, cnpj_digits: str) -> str:
    text = re.sub(r"\s+", " ", str(name or "")).strip()
    text = re.sub(r"^[\d.\s/-]+", "", text).strip()
    if cnpj_digits:
        formatted = format_cnpj(cnpj_digits)
        if text.startswith(formatted):
            text = text[len(formatted) :].strip(" -")
    return re.sub(r"\s+", " ", text).strip()


def normalize_contabilidade(name: object) -> str:
    raw = re.sub(r"\s+", " ", str(name or "")).strip()
    if not raw:
        return "SEM CONT"
    alias = CONTABILIDADE_ALIASES.get(raw.lower())
    if alias:
        return alias
    if raw.upper() == raw and len(raw) <= 6:
        return raw.upper()
    return raw


def score_row(row: dict) -> tuple:
    named = 0 if row["contabilidade"] == "SEM CONT" else 1
    iguatemi = 1 if row["unidade"] == "ROM Iguatemi" else 0
    return (named, iguatemi, len(row["name"]))


def load_sheet(workbook: openpyxl.Workbook, sheet_name: str) -> list[dict]:
    unidade = UNIDADE_BY_SHEET[sheet_name]
    ws = workbook[sheet_name]
    rows: list[dict] = []
    for index, values in enumerate(ws.iter_rows(values_only=True), start=1):
        if index == 1:
            continue
        empresa, cnpj, contabilidade = (values + (None, None, None))[:3]
        if not empresa:
            continue
        digits = only_digits(cnpj)
        if len(digits) != 14:
            continue
        rows.append(
            {
                "name": clean_name(empresa, digits),
                "cnpj": format_cnpj(digits),
                "cnpj_digits": digits,
                "contabilidade": normalize_contabilidade(contabilidade),
                "unidade": unidade,
                "sheet": sheet_name,
                "row": index,
            }
        )
    return rows


def merge_profissionais(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["cnpj_digits"]].append(row)

    merged: list[dict] = []
    conflicts: list[dict] = []
    for digits, group in grouped.items():
        winner = max(group, key=score_row)
        variants = []
        for item in group:
            variants.append(
                {
                    "name": item["name"],
                    "contabilidade": item["contabilidade"],
                    "unidade": item["unidade"],
                    "sheet": item["sheet"],
                    "row": item["row"],
                }
            )
        unique_names = {item["name"] for item in group}
        unique_conts = {item["contabilidade"] for item in group}
        if len(group) > 1 and (len(unique_names) > 1 or len(unique_conts) > 1):
            conflicts.append({"cnpj": winner["cnpj"], "kept": winner["name"], "variants": variants})
        merged.append(
            {
                "name": winner["name"],
                "cnpj": winner["cnpj"],
                "contabilidade": winner["contabilidade"],
                "unidade": winner["unidade"],
            }
        )
    merged.sort(key=lambda item: (item["unidade"], item["name"]))
    return merged, conflicts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx")
    args = parser.parse_args()

    workbook = openpyxl.load_workbook(args.xlsx, data_only=True, read_only=True)
    rows = load_sheet(workbook, "BRASIL") + load_sheet(workbook, "IGUATEMI")
    profissionais, conflicts = merge_profissionais(rows)
    contabilidades = sorted({item["contabilidade"] for item in profissionais})

    json.dump(
        {
            "source": args.xlsx,
            "contabilidades": contabilidades,
            "profissionais": profissionais,
            "conflicts": conflicts,
            "counts": {
                "raw": len(rows),
                "profissionais": len(profissionais),
                "contabilidades": len(contabilidades),
                "conflicts": len(conflicts),
            },
        },
        sys.stdout,
        ensure_ascii=False,
        indent=2,
    )
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
