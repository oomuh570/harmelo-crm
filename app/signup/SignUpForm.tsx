'use client';


import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faLock, faPhone, faUser, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useActionState, useState, startTransition } from "react";

import { DM_Sans } from "next/font/google";
import SignUpAction from "@/auth/signup-action";



const dmSans = DM_Sans({
    subsets: ["latin"]
});



export default function SignupForm() {
    const [passShown, setPassShown] = useState(false);
    const [state, action, pending] = useActionState(SignUpAction, undefined)
    
     const handleSubmit = (e) => {
        e.preventDefault();
        startTransition(() => {
            action(new FormData(e.target));
        });
    };
    return (
        
        <form onSubmit={handleSubmit}>
            <div className={`${dmSans.className} flex flex-col self-center gap-4 p-12`}>
                <div className="relative">
                    <FontAwesomeIcon 
                        icon={faUser} 
                        className="text-gray-400 absolute top-5 -translate-y-1/2  pl-1"
                    />
                    <input 
                        type="text" 
                        name="fullName"
                        placeholder="Full Name" 
                        className="text-white placeholder-gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full" 
                    />
                </div>
                {state?.errors?.fullName && (<p className="text-red-500 text-sm">{state.errors.fullName}</p>)}
                
                <div className="relative">
                    <FontAwesomeIcon 
                        icon={faPhone} 
                        className="text-gray-400 absolute top-5 -translate-y-1/2  pl-1"
                    />
                    <input 
                        type="tel" 
                        name="phoneNumber"
                        placeholder="Phone Number"                       
                        className="text-white placeholder-gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full"                
                    /> 
                </div>   
                {state?.errors?.phoneNumber && (<p className="text-sm text-red-500 h-4">{state.errors.phoneNumber}</p>)}  
                <div className="relative">
                    <FontAwesomeIcon 
                        icon={faEnvelope} 
                        className="text-gray-400 absolute top-5 -translate-y-1/2  pl-1"
                    />
                    <input 
                        type="email" 
                        name="email"
                        placeholder="Email" 
                        className="text-white placeholder-gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full"           
                    />   
                </div>
                {state?.errors?.email && (<p className="text-sm text-red-500">{state.errors.email}</p>)}
                <div className="relative">
                    <FontAwesomeIcon 
                        icon={faLock} 
                        className="text-gray-400 absolute top-5 -translate-y-1/2 pl-1"
                    />
                    <FontAwesomeIcon onClick={() => setPassShown(!passShown)} icon={passShown ? faEye : faEyeSlash} className=" text-gray-400 absolute right-3 top-5 -translate-y-1/2 cursor-pointer"/>
                    
                    <input 
                        type= {passShown ? 'text' : 'password'}
                        name="password"
                        placeholder="Password" 
                        className="text-white placeholder--gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full"
                    />   
                </div>
                    {state?.errors?.password && (
                    <div className="text-sm text-red-500">
                        <p>Password must:</p>
                        <ul>
                        {state.errors.password.map((error) => (
                            <li key={error}>- {error}</li>
                        ))}
                        </ul>
                    </div>
                    )}
                
                
                <button 
                    className= "text-black p-2 rounded-md bg-green-300 hover:bg-green-200 cursor-pointer"
                    type="submit"                        
                    >
                        {pending ? 'Submitting...' : 'Sign Up'}
                </button>
            </div>
        </form>
       
    );
}