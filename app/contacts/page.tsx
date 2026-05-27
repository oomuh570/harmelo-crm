import Sidebar from "@/components/sidebar";
import { columns, Contact } from "./columns"
import { DataTable } from "./data-table"
import { Fraunces } from "next/font/google";
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
 
} from "@/components/ui/popover"
const fraunces = Fraunces({
subsets: ["latin"],
  });
async function getData(): Promise<Contact[]>{
   
    return [
        {
            id:'1',
            name: "John Doe",
            phoneNumber: "403-330-2322",
            email: "johndoe@gmail.com"
        },
        {
            id:'2',
            name: "Jane Doe",
            phoneNumber: "403-254-8943",
            email: "janedoe@gmail.com"
        },
        {
            id:'3',
            name: "James Doe",
            phoneNumber: "403-232-6784",
            email: "jamesdoe@gmail.com"
        }
    ]
}



export default async function ContactsPage(){
    const data = await getData()
    return(
        <div className="w-screen h-screen bg-[#07090F]">
            <div className="flex">
                <Sidebar/>
                <div className=" h-screen flex flex-col items-center w-full">
                    <h1 className={`${fraunces.className} text-3xl mt-5 text-white`}>Contacts</h1>
                    <div className="w-[50%] mt-20">
                        <Popover>
                            <PopoverTrigger className='p-2 rounded-md mb-2 bg-green-400 hover:bg-green-500 cursor-pointer'>
                                Add Contact
                            </PopoverTrigger>
                            <PopoverContent className="h-80 ">
                                <PopoverHeader>
                                    <PopoverTitle className="text-center mb-5 text-lg">Add Contact</PopoverTitle>
                                    <form className="flex flex-col gap-2">
                                        <label>Name</label>
                                        <input className="border p-1 rounded-md" name="name"></input>
                                        <label>Email</label>
                                        <input className="border p-1 rounded-md" name="email"></input>
                                        <label>Phone Number</label>
                                        <input className="border p-1 rounded-md" name="phonenumber"></input>
                                    </form>
                                    <button className="self-center mt-4 bg-green-400 hover:bg-green-500 w-[40%] rounded-md p-1 cursor-pointer">Save</button>
                                </PopoverHeader>
                            </PopoverContent>
                        </Popover>
                        <DataTable columns={columns} data={data}/>
                    </div>
                </div>
            </div>
        </div>
    )
}
