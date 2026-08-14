/**
 * Testa sincronização IMAP localmente.
 * Uso: npm run email:sync
 */

import { syncEmailInbox } from "../src/lib/sync-email-imap";

async function main() {
  const result = await syncEmailInbox();
  console.log("Resultado:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
