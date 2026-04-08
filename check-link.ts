import { supabase } from './src/lib/supabase'

async function check() {
  const result = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { skipBrowserRedirect: true }
  });
  console.log(result);
}
