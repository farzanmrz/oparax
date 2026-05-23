import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="auth-page">
      <div className="auth-message">
        <h1 className="auth-heading">Check your email</h1>
        <p className="auth-helper">
          We sent you a confirmation link. Please check your email and click the
          link to activate your account.
        </p>
        <Link
          href="/login"
          className="auth-link"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
