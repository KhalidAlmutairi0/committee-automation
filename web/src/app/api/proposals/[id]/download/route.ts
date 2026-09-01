import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { query } from "@/server/db";

export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser(); if(!user)return new NextResponse("Unauthorized",{status:401});
 const {id}=await params; if(!/^[0-9a-f-]{36}$/i.test(id))return new NextResponse("Not found",{status:404});
 const ownerClause=user.role==="team"?" AND p.owner_user_id=$2":"";
 const rows=await query<{original_name:string|null;mime_type:string|null;file_data:Buffer|null}>(`SELECT pr.original_name,pr.mime_type,pr.file_data FROM proposals pr JOIN projects p ON p.id=pr.project_id WHERE pr.id=$1${ownerClause} LIMIT 1`,user.role==="team"?[id,user.id]:[id]);
 const file=rows[0]; if(!file?.file_data)return new NextResponse("Not found",{status:404});
 const safeName=(file.original_name||"proposal").replace(/[\r\n"\\/]/g,"_");
 return new NextResponse(new Uint8Array(file.file_data),{headers:{"Content-Type":file.mime_type||"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
