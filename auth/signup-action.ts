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


    const {fullName, email, phoneNumber, password} = validationResult.data;
    //send data to backend to store in db
    //backend should create a unique user id
    try{
        const res = await fetch("backend-api", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
        body: JSON.stringify({fullName, email, phoneNumber, password}), 
        })

        if(!res.ok){
            throw new Error('Request failed')
        }

        const data = await res.json()
    }
    catch(error){
        console.log(error)
    }

}

