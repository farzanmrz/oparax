import Link from "next/link"

import "@/app/auth-pages.css"

export default function CheckEmailPage() {
  return (
    <div className="auth-shell">
      <div className="modal">
        <h2>Check your email</h2>
        <p className="msub">
          We sent you a confirmation link. Please check your email and click
          the link to activate your account.
        </p>
        <p className="mswitch">
          <Link href="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  )
}
