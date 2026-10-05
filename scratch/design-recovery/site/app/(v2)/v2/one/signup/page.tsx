import { OneLogin } from "@/v2/one/login";

export const metadata = { title: "Oparax | One: Sign up" };

// The login page with the sign-up form first.
export default function Page() {
  return <OneLogin initial="signup" />;
}
