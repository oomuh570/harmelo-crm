import Sidebar from "@/components/sidebar";

export default function Dashboard() {
  return(
         <div className="w-screen h-screen">
             <div className="flex">
                 <Sidebar/>
                 <div className=" h-screen w-full">
                     <h1 className="text-center text-3xl ">Dashboard</h1>
                 </div>
             </div>
         </div>
     )
}
