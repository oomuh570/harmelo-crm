import LoginForm from "./LoginForm";
import { Fraunces } from "next/font/google";
import Link from "next/link";
const fraunces = Fraunces({
subsets: ["latin"],
  });
export default function Login(){
    return(
       <div className="flex justify-center items-center bg-[#07090F] h-screen">
            <div className="flex flex-col items-center border border-gray-400 rounded-3xl">
                <h1 className={`${fraunces.className} text-white text-2xl self-center pt-5 pb-5 `} >Login</h1>
                <LoginForm/>
                <div className="flex gap-1 pb-20">
                    <p className="text-white">Don't have an account?</p>
                    <Link className="text-blue-400 cursor-pointer hover:text-blue-300" href='/signup'>Sign Up</Link>
                </div>
            </div>
        </div>
    )
}