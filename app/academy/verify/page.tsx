import { redirect } from "next/navigation";

/** Legacy/alternate OTP path — canonical login is /login */
export default function AcademyVerifyRedirect() {
  redirect("/login");
}
