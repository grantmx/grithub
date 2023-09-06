import Style from "./Profile.module.scss";

import clsx from "clsx";
import { getStorage, ref, getDownloadURL, getMetadata } from "firebase/storage";
import { useEffect, useState } from "react";
import { firebaseStorage } from "ui/services/firebase";


async function getFirebaseDownloadURL(urlRef){
    return await getDownloadURL(urlRef)
        .then(url => {
            console.log(url)

            return url
        })
        .catch((error) => {
            console.log(error.code)
            switch (error.code) {
            case 'storage/object-not-found':
                // File doesn't exist
                break;
            case 'storage/unauthorized':
                // User doesn't have permission to access the object
                break;
            case 'storage/canceled':
                // User canceled the upload
                break;
            case 'storage/unknown':
                // Unknown error occurred, inspect the server response
                break;
            }
        });
}



function Upload({ cvURL, certURL, idURL }){
    const [ urls, setUrls ] = useState({
        cv: "",
        cert: "",
        id: ""
    })

    
    // const certRef = ref(firebaseStorage, certURL);
    // const idRef = ref(firebaseStorage, idURL);

    useEffect(() => {
        if( cvURL && certURL && idURL ){
            const cvRef = ref(firebaseStorage, "internship_applications/cv (3).pdf");

            getFirebaseDownloadURL(cvRef).then(url => {
                setUrls({
                    ...urls,
                    cv: url
                })
            })    

        }

    }, [ cvURL, certURL, idURL ])




    return(
        <li className={clsx(Style.submission, Style.complete)}>
            <header className={Style.submissionHeading}>
                <h2 className={Style.submissionTitle}>
                    Uploads
                </h2>
            </header>

            <div className={clsx(Style.body, Style.bodyOutline)}>
                <dl className={Style.list}>
                    <div className={clsx(Style.listGroup, Style.listGroupRow)}>
                        <svg id="icon-insert_drive_file" viewBox="0 0 24 24" className={Style.icon}>
                            <path d="M12.984 9h5.531l-5.531-5.484v5.484zM6 2.016h8.016l6 6v12c0 1.078-0.938 1.969-2.016 1.969h-12c-1.078 0-2.016-0.891-2.016-1.969l0.047-16.031c0-1.078 0.891-1.969 1.969-1.969z"></path>
                        </svg>

                        <span>
                            <dd>
                                <a 
                                    target="_blank"
                                    href={urls?.cv} 
                                    download={true}
                                >
                                    Curriculum Vitae
                                </a>
                            </dd>
                            <dt>File</dt>
                        </span>
                    </div>

                    <div className={clsx(Style.listGroup, Style.listGroupRow)}>
                        <svg id="icon-insert_drive_file" viewBox="0 0 24 24" className={Style.icon}>
                            <path d="M12.984 9h5.531l-5.531-5.484v5.484zM6 2.016h8.016l6 6v12c0 1.078-0.938 1.969-2.016 1.969h-12c-1.078 0-2.016-0.891-2.016-1.969l0.047-16.031c0-1.078 0.891-1.969 1.969-1.969z"></path>
                        </svg>

                        <span>
                            <dd>
                                <a 
                                    target="_blank"
                                    href={certURL} 
                                    download={true}
                                >
                                    Matric Certificate
                                </a>
                            </dd>
                            <dt>File</dt>
                        </span>
                    </div>


                    <div className={clsx(Style.listGroup, Style.listGroupRow)}>
                        <svg id="icon-insert_drive_file" viewBox="0 0 24 24" className={Style.icon}>
                            <path d="M12.984 9h5.531l-5.531-5.484v5.484zM6 2.016h8.016l6 6v12c0 1.078-0.938 1.969-2.016 1.969h-12c-1.078 0-2.016-0.891-2.016-1.969l0.047-16.031c0-1.078 0.891-1.969 1.969-1.969z"></path>
                        </svg>

                        <span>
                            <dd>
                            <a 
                                    target="_blank"
                                    href={idURL} 
                                    download={true}
                                >
                                   ID
                                </a>
                            </dd>
                            <dt>File</dt>
                        </span>
                    </div>



                  
                    
         
                </dl>
            </div>
        </li> 
    )
}

export default Upload;