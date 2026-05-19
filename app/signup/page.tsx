import SignupForm from "./SignUpForm";
import { Fraunces } from "next/font/google";
import Link from "next/link";
const fraunces = Fraunces({
  subsets: ["latin"],
});
export default function SignUp(){

    return(
        <div className="flex justify-center items-center bg-[#07090F] h-screen">
            <div className="flex flex-col items-center border border-gray-400 rounded-3xl">
                <h1 className={`${fraunces.className} text-white text-2xl self-center pt-5 pb-5 `} >Sign Up</h1>
                <SignupForm/>
                <div className="flex gap-1 pb-20">
                    <p className="text-white">Already have an account?</p>
                    <Link className="text-blue-400 cursor-pointer hover:text-blue-300" href='/login'>Log In</Link>
                </div>
            </div>
        </div>
    )
}