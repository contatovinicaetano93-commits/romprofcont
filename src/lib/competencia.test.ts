import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  competenciaForDocumento,
  competenciaFromDate,
  competenciaMonth,
  isSameCompetenciaMonth,
  uniqueCompetenciaMonths,
} from "./competencia";

describe("competencia date helpers", () => {
  it("formats the Brazil calendar date from the email timestamp", () => {
    const sent = new Date("2026-09-15T22:30:00.000-03:00");
    assert.equal(competenciaFromDate(sent), "15/09/2026");
  });

  it("keeps a late-night Brazil send on the same calendar day", () => {
    const sent = new Date("2026-09-15T23:45:00.000-03:00");
    assert.equal(competenciaFromDate(sent), "15/09/2026");
  });

  it("extracts the month bucket from full dates and MM/YYYY", () => {
    assert.equal(competenciaMonth("15/09/2026"), "09/2026");
    assert.equal(competenciaMonth("09/2026"), "09/2026");
    assert.equal(isSameCompetenciaMonth("03/09/2026", "09/2026"), true);
    assert.equal(isSameCompetenciaMonth("15/08/2026", "09/2026"), false);
  });

  it("prefers the email sent date over a stored month", () => {
    assert.equal(
      competenciaForDocumento({
        competencia: "09/2026",
        emailSentAt: "2026-09-08T14:12:00.000-03:00",
      }),
      "08/09/2026",
    );
    assert.equal(
      competenciaForDocumento({ competencia: "09/2026", emailSentAt: null }),
      "09/2026",
    );
  });

  it("lists unique months newest first", () => {
    assert.deepEqual(
      uniqueCompetenciaMonths(["03/09/2026", "09/2026", "15/08/2026", "01/2026"]),
      ["09/2026", "08/2026", "01/2026"],
    );
  });
});
