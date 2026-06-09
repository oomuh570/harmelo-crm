import SignupForm from "./SignUpForm";
import Link from "next/link";

export default function SignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090F] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#0f1117] px-8 py-10 shadow-xl">
        <h1 className="font-heading text-center text-2xl text-white">Sign Up</h1>
        <p className="mt-1 text-center text-sm text-gray-400">Create your Harmelo account</p>
        <SignupForm />
        <div className="flex justify-center gap-1 text-sm">
          <p className="text-gray-400">Already have an account?</p>
          <Link
            className="text-[#00D4B8] hover:text-[#00D4B8]/80 cursor-pointer"
            href="/login"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
