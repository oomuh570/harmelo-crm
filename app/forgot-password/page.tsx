import ForgotPasswordForm from './forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090F] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#0f1117] px-8 py-10 shadow-xl">
        <h1 className="font-heading text-center text-2xl text-white">Reset Password</h1>
        <p className="mt-1 text-center text-sm text-gray-400">Enter your email to receive a reset link</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <div className="flex justify-center gap-1 text-sm mt-6">
          <a href="/login" className="text-[#00D4B8] hover:text-[#00D4B8]/80 cursor-pointer">
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
