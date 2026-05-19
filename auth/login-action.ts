'use server';

import { LoginSchema } from "./definitions";

export default async function LoginAction(state: any, formData: FormData){
    const validationResult = LoginSchema.safeParse({
           fullName: formData.get("fullName"),
           email: formData.get("email"),
           phoneNumber: formData.get("phoneNumber"),
           password: formData.get("password")
       })
       
       if(!validationResult.success){
           return{
               errors: validationResult.error.flatten().fieldErrors,
           };
               
           
       }
   
}
    

