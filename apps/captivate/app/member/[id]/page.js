import QRCode from "react-qr-code";
import Style from "./MemberCard.module.scss"
import Image from "next/image";
import logo from "@/public/assets/grithub-logo-circle-all-white.svg";
import Airtable from "@/services/airtable/airtable.service"
import { notFound } from "next/navigation";


async function MemberCard({ params }) {
    const { id } = await params;
    const airtable = new Airtable({ baseTable: "tblHcVfzBAeaye7EI" });
    const member = await airtable.get(id);

    if (member.error || !member ) {
        notFound()
    }

    return(
        <section className={Style.block}>

            <article className={Style.card}>
                <header className={Style.header}>
                    <Image src={logo.src} alt="GRIT Hub Logo" width={75} height={75} className={Style.logo} />

                    <h1 className={Style.title}>
                        {member?.fields?.['First Name']} {member?.fields?.['Last Name']}

                        <small className={Style.label}>Member Name</small>
                    </h1>


                    <dl className={Style.details}>
                        <div className={Style.col}>
                            <dt className={Style.label}>
                                Member Level
                            </dt>
                            <dd className={Style.text}>
                                {member?.fields?.Membership}
                            </dd>
                        </div>

                        <div className={Style.col}>
                            <dt className={Style.label}>
                                Joined
                            </dt>
                            <dd className={Style.text}>
                                {member.fields?.["Enrollment Date"]}
                            </dd>
                        </div>
                    </dl>
                </header>

                <div className={Style.qrCntr}>
                    <QRCode
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={JSON.stringify({ member_id: id })}
                        viewBox={`0 0 256 256`}
                    />
                </div>
            </article>

        </section>
    )
}

export default MemberCard;