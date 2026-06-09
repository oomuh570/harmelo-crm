'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faEye, faEyeSlash, faLock } from '@fortawesome/free-solid-svg-icons'
import { useState, useActionState } from "react";
import LoginAction from "@/auth/login-action";

const inputBase =
  "w-full rounded-md border border-gray-700 bg-[#07090F] py-2 pl-9 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]";
const iconClass = "text-gray-500 absolute left-3 top-1/2 -translate-y-1/2";

export default function LoginForm() {
  const [passShown, setPassShown] = useState(false);
  const [state, action, pending] = useActionState(LoginAction, null)
  return (
    <form action={action}>
      <div className="flex flex-col gap-4 py-6">
        <div className="relative">
          <FontAwesomeIcon icon={faEnvelope} className={iconClass} />
          <input
            placeholder="Email"
            name="email"
            className={`${inputBase} pr-3`}
          />
        </div>

        <div className="relative">
          <FontAwesomeIcon icon={faLock} className={iconClass} />
          <FontAwesomeIcon
            onClick={() => setPassShown(!passShown)}
            icon={passShown ? faEye : faEyeSlash}
            className="text-gray-500 hover:text-gray-300 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
          />
          <input
            type={passShown ? 'text' : 'password'}
            placeholder="Password"
            name="password"
            className={`${inputBase} pr-9`}
          />
        </div>

        {state?.message && <p className="text-sm text-red-400">{state.message}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-md bg-[#00D4B8] py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50"
        >
          {pending ? 'Logging In...' : 'Login'}
        </button>
      </div>
    </form>
  );
}
