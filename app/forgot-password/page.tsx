import HandOverApp from "@/components/HandOverApp";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  return <HandOverApp screen="forgot" authConfigured={isSupabaseConfigured()} />;
}
