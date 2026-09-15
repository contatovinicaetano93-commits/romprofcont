import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assistantNavItem, navItems, navSections } from "./navigation";

describe("sidebar sections", () => {
  it("splits daily work from master data and keeps unique paths", () => {
    assert.deepEqual(
      navSections.map((section) => section.label),
      ["Operação", "Cadastro"],
    );
    assert.deepEqual(
      navSections[0].items.map((item) => item.label),
      ["Dashboard", "Aprovação", "Pendências"],
    );
    assert.deepEqual(
      navSections[1].items.map((item) => item.label),
      ["Contabilidades", "Base Mestre"],
    );
    assert.equal(assistantNavItem.label, "Assistente");

    const paths = navItems.map((item) => item.path);
    assert.equal(new Set(paths).size, paths.length);
    assert.deepEqual(paths, [
      "/",
      "/documentos",
      "/pendencias",
      "/contabilidades",
      "/base-mestre",
      "/assistente",
    ]);
  });
});
