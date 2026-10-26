import { login } from "../actions";
import { AuthForm } from "../AuthForm";

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to keep your streak going."
      submit="Log in"
      action={login}
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
      footer={{ text: "New here?", href: "/onboarding", link: "Get started" }}
    />
  );
}
