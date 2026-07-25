import {redirect} from "next/navigation";

export default function Home() {
    // Redirect to login page as the default landing
    redirect("/login");
}
