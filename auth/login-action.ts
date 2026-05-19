'use server';

import { LoginSchema } from "./definitions";

export default async function LoginAction(state: any, formData: FormData){
    const validationResult = LoginSchema.safeParse({
           email: formData.get("email"),
           password: formData.get("password")
       })
       
       if(!validationResult.success){
           return{
               errors: validationResult.error.flatten().fieldErrors,
           };
               
           
    }

    const {email, password} = validationResult.data;

    

    //check if email or password is correct from database
    //do an api fetch from database 
    
   
}
    

