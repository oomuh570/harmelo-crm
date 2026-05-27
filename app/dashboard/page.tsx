import Sidebar from "@/components/sidebar";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
subsets: ["latin"],
  });
export default function Dashboard() {
  return(
         <div className="w-screen h-screen bg-[#07090F]">
             <div className="flex">
                 <Sidebar/>
                 <div className=" h-screen w-full">
                     <h1 className={`${fraunces.className} text-3xl mt-5 text-center text-white`}>Dashboard</h1>
                 </div>
             </div>
         </div>
     )
}
