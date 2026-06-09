'use client';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faPhone, faUser, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useActionState, useState, startTransition } from "react";

import SignUpAction from "@/auth/signup-action";

const inputBase =
    "w-full rounded-md border border-gray-700 bg-[#07090F] py-2 pl-9 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]";
const iconClass = "text-gray-500 absolute left-3 top-1/2 -translate-y-1/2";



export default function SignupForm() {
    const [passShown, setPassShown] = useState(false);
    const [phone, setPhone] = useState('');
    const [state, action, pending] = useActionState(SignUpAction, undefined)

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        let formatted = digits;
        if (digits.length > 6) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
        setPhone(formatted);
    }

     const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        startTransition(() => {
            action(new FormData(e.currentTarget));
        });
    };
    return (

        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 py-6">
                <div className="relative">
                    <FontAwesomeIcon icon={faUser} className={iconClass} />
                    <input
                        type="text"
                        name="fullName"
                        placeholder="Full Name"
                        className={`${inputBase} pr-3`}
                    />
                </div>
                {state?.errors?.fullName && (<p className="text-sm text-red-400">{state.errors.fullName}</p>)}

                <div className="relative">
                    <FontAwesomeIcon icon={faPhone} className={iconClass} />
                    <input
                        type="tel"
                        name="phoneNumber"
                        placeholder="Phone Number"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={12}
                        className={`${inputBase} pr-3`}
                    />
                </div>
                {state?.errors?.phoneNumber && (<p className="text-sm text-red-400">{state.errors.phoneNumber}</p>)}
                <div className="relative">
                    <FontAwesomeIcon icon={faEnvelope} className={iconClass} />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        className={`${inputBase} pr-3`}
                    />
                </div>
                {state?.errors?.email && (<p className="text-sm text-red-400">{state.errors.email}</p>)}
                <div className="relative">
                    <FontAwesomeIcon icon={faLock} className={iconClass} />
                    <FontAwesomeIcon
                        onClick={() => setPassShown(!passShown)}
                        icon={passShown ? faEye : faEyeSlash}
                        className="text-gray-500 hover:text-gray-300 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    />
                    <input
                        type={passShown ? 'text' : 'password'}
                        name="password"
                        placeholder="Password"
                        className={`${inputBase} pr-9`}
                    />
                </div>
                    {state?.errors?.password && (
                    <div className="text-sm text-red-400">
                        <p>Password must:</p>
                        <ul>
                        {state.errors.password.map((error) => (
                            <li key={error}>- {error}</li>
                        ))}
                        </ul>
                    </div>
                    )}


                <button
                    className="mt-2 w-full rounded-md bg-[#00D4B8] py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50"
                    type="submit"
                    disabled={pending}
                    >
                        {pending ? 'Submitting...' : 'Sign Up'}
                </button>
            </div>
        </form>

    );
}
