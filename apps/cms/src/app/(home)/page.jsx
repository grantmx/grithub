import { redirect } from "next/navigation";

async function Page() {
    return redirect("/admin");
}

export default Page;