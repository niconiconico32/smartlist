// Render the credentials email to disk for visual review. Sends nothing.
// Run with: npx deno run --allow-write --allow-read scripts/render-credentials-email.ts
import { writeFileSync } from "node:fs";
import { buildCredentialsEmail } from "../supabase/functions/_shared/funnel-credentials-email.ts";

// Review artifacts live outside the repo so a preview can never be committed
// by accident.
const OUT = "C:/Users/nico/AppData/Local/Temp/opencode/email-review";

// Fictitious data only: example.com is the RFC 2606 reserved documentation
// domain and can never reach a real inbox.
const created = buildCredentialsEmail({
  email: "alex@example.com",
  password: "482731",
  accountCreated: true,
});
const existing = buildCredentialsEmail({
  email: "alex@example.com",
  password: null,
  accountCreated: false,
});

for (const [name, mail] of Object.entries({ created, existing })) {
  writeFileSync(`${OUT}-${name}.html`, mail.html);
  writeFileSync(`${OUT}-${name}.txt`, mail.text);
  console.log(`${name}: html ${mail.html.length}b · text ${mail.text.length}b`);
  console.log(`  subject:   ${mail.subject}`);
}