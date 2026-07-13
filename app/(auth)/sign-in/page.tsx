import { Panel } from "@/components/meridian";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignInPage() {
  return (
    <Panel corners className="p-8">
      <AuthForm initialMode="in" />
    </Panel>
  );
}
