import { notFound } from "next/navigation";
import { requireCommittee } from "@/server/auth/session";
import { reviewForViewer } from "@/server/data";
import ReviewEditor from "./review-editor";

export default async function ReviewPage({params}:{params:Promise<{id:string}>}){
 const user=await requireCommittee(); const {id}=await params; const review=await reviewForViewer(id,user); if(!review)notFound();
 return <ReviewEditor review={review} user={{name:user.name,role:user.role}} smtpReady={Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.SMTP_FROM)}/>;
}
