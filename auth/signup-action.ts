'use server';

import { SignupSchema } from "./definitions";


export default async function SignUpAction(state: any, formData: FormData){
    const validationResult = SignupSchema.safeParse({
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

