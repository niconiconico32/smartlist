// Renders the credentials email to disk for visual review. Sends nothing.
// Run with: npx deno run --allow-write --allow-read scripts/render-credentials-email.ts
import { writeFileSync } from "node:fs";
import { buildCredentialsEmail } from "../supabase/functions/_shared/funnel-credentials-email.ts";

const OUT = "C:/Users/nico/AppData/Local/Temp/opencode/email-preview";

const created = buildCredentialsEmail({
  email: "primera.compra@ejemplo.com",
  password: "004207",
  accountCreated: true,
});
const existing = buildCredentialsEmail({
  email: "cuenta.previa@ejemplo.com",
  password: null,
  accountCreated: false,
});

for (const [name, mail] of Object.entries({ created, existing })) {
  writeFileSync(`${OUT}-${name}.html`, mail.html);
  writeFileSync(`${OUT}-${name}.txt`, mail.text);
  console.log(`${name}: html ${mail.html.length}b · text ${mail.text.length}b · "${mail.subject}"`);
}
console.log(`escrito en ${OUT}-*.html / *.txt`);