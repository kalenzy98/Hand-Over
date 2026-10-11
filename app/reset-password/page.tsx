import HandOverApp from "@/components/HandOverApp";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordPage() {
  return <HandOverApp screen="reset" authConfigured={isSupabaseConfigured()} />;
}
