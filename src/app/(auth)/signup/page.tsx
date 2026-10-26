import { signup } from "../actions";
import { AuthForm } from "../AuthForm";

export default function SignupPage() {
  return (
    <AuthForm
      title="Create your profile"
      subtitle="Save your progress and keep your streak on any device."
      submit="Create profile"
      action={signup}
      fields={[
        { name: "name", label: "Name", type: "text", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        {
          name: "password",
          label: "Password (8+ characters)",
          type: "password",
          autoComplete: "new-password",
        },
      ]}
      footer={{ text: "Already have one?", href: "/login", link: "Log in" }}
    />
  );
}
