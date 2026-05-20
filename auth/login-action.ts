'use server';

import { createSession } from "@/lib/session";
import { LoginSchema } from "./definitions";
import { redirect } from "next/navigation";

export default async function LoginAction(state: any, formData: FormData){
    const validationResult = LoginSchema.safeParse({
           email: formData.get("email"),
           password: formData.get("password")
       })
       
       if(!validationResult.success){
           return{
               message: "Invalid password or email"
        };
               
           
    }

    const testUser = {
        id: '1',
        email: 'test@gmail.com',
        password: '#Test123'
    }

    const {email, password} = validationResult.data;
    
    //test
    if(email != testUser.email || password != testUser.password){
        
        return {
            message: "Invalid password or email"
        }
        
    }
    await createSession(testUser.id);
    
    redirect("/dashboard")

    //check if email or password is correct from database
    //do an api fetch from database 
    /*
    try{
        const res = await fetch("backend-api",{
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password}), 
        })

        if(!res.ok){
            return{
                errors: ["Invalid password or email"]
            }
        }

        const data = await res.json()
        
        //create session with user id
        await createSession(testUser.id);

        redirect("/dashboard");
      
    }
    catch(error){
        console.log(error)
    }
    */
   
}
    

