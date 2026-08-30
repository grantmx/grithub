"use client"

import { useState } from "react";
import { IconLocation } from "@/components/icons/IconLocation";
import Style from "./MapEmbed.module.scss";
import Image from "next/image";

const MAP_SRC = "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d13235.23749715816!2d22.4444244!3d-33.9717388!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1dd61bad26029aad%3A0xe15b07dedb1520bf!2sGarden%20Route%20Innovation%20and%20Technology%20Hub!5e0!3m2!1sen!2sus!4v1731931229527!5m2!1sen!2sus";

export function MapEmbed({ previewSrc }){
    const [loaded, setLoaded] = useState(false);

    if (loaded) {
        return (
            <div className="w-100" style={{ maxWidth: 600, aspectRatio: "600 / 700" }}>
                <iframe
                    src={MAP_SRC}
                    title="GRIT Hub location on Google Maps"
                    width="450" 
					height="700" 
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setLoaded(true)}
            className={Style.button}
        >
            {previewSrc ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <Image
                        src={previewSrc}
                        alt="Map showing GRIT Hub location"
                        style={{ objectFit: "cover" }}
                        width={450}
                        height={700}
                        loading="lazy"
                    />
                    <span
                        className={Style.overlay}
                        style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                        View interactive map &raquo;
                    </span>
                </>
            ) : (
                <span className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-light text-muted">
                    <IconLocation width={28} height={38} className="mb-2" />
                    View map
                </span>
            )}
        </button>
    );
}
