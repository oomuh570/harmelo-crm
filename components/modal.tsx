import { createPortal } from "react-dom"

export default function Modal({contact, onClose}: {contact: string}){
    return createPortal(
        <>
            <div className="bg-black/60 top-0 left-0 bottom-0 right-0 z-1000 fixed"></div>
            <div className="rounded-md bg-gray-400 fixed top-[30%] left-[55%] z-1000 translate-x-[-50%] translate-y-[-50%] w-[20%] h-[40%]">
                <div>
                    <h1></h1>
                    <button onClick={onClose}>close</button>
                </div>
            </div>
        </>,
        document.body
    )
        
    
}