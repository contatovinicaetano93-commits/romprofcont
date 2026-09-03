import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickMatchingCnpj } from "./extract-document-fields";

describe("pickMatchingCnpj", () => {
  it("prefers the CNPJ that exists in the Base Mestre", () => {
    const text = "Emitente 01.530.207/0001-30 contribuinte 30.021.692/0001-15";
    const picked = pickMatchingCnpj([text], ["30021692000115"]);
    assert.equal(picked, "30.021.692/0001-15");
  });
});
