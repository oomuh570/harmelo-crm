'use client'
import Link from "next/link";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faEye, faEyeSlash, faLock } from '@fortawesome/free-solid-svg-icons'

import { useState } from "react";
import { DM_Sans } from "next/font/google";
import LoginAction from "@/auth/login-action";


const dmSans = DM_Sans({
    subsets: ["latin"]
});

export default function LoginForm() {
  const [passShown, setPassShown] = useState(false);
  return (
   
      <form action={LoginAction}>
        <div className={`${dmSans.className} flex flex-col self-center gap-4 p-12`}>
          <div className="relative">
              <FontAwesomeIcon 
                  icon={faEnvelope} 
                  className="text-gray-400 absolute top-5 -translate-y-1/2 pl-1"
              />

              <input 
                  type="email"
                  placeholder="Email" 
                  name="email"
                  
                  className="text-white placeholder-gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full" 
                  required
              />
            </div>

            <div className="relative">
              <FontAwesomeIcon 
                  icon={faLock} 
                  className="text-gray-400 absolute top-5 -translate-y-1/2 pl-1"
              />
              {passShown && <FontAwesomeIcon onClick={() => setPassShown(!passShown)} icon={faEye} className=" text-gray-400 absolute right-3 top-5 -translate-y-1/2 cursor-pointer"/>}
              {!passShown && <FontAwesomeIcon onClick={() => setPassShown(!passShown)} icon={faEyeSlash} className=" text-gray-400 absolute right-3 top-5 -translate-y-1/2 cursor-pointer"/>}
              <input 
                  type={passShown ? 'text' : 'password'}
                  placeholder="Password" 
                  name="password"
                  
                  className="text-white placeholder-gray-400 p-2 border pl-6 border-gray-500 rounded-md w-full"
                  required
              />
            </div>
            <button type="submit" className="text-black p-2 rounded-md cursor-pointer bg-green-300 hover:bg-green-200">Login</button>
        </div>
      </form>
   
  );
}