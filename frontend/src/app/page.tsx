import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to user dashboard as the default landing
  redirect("/user");
}
