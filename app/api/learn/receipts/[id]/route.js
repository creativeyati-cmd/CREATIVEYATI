import { createSupabaseServiceClient, getStudentUser } from "@/lib/supabase/server";
import { getDocumentSettings } from "@/lib/data/settings";
import { orderReceipt } from "@/lib/documents/order-receipt";
import { buildInvoicePdf } from "@/lib/documents/invoice-pdf";
export async function GET(request,{params}) {
 const user=await getStudentUser();
 if(!user)return Response.json({error:"Sign in to download your receipt."},{status:401});
 const service=createSupabaseServiceClient();
 if(!service)return Response.json({error:"Receipts are unavailable."},{status:503});
 const {id}=await params;
 const {data:order,error}=await service.from("orders").select("*,courses(title)").eq("id",id).eq("student_id",user.id).eq("payment_status","successful").maybeSingle();
 if(error||!order||Number(order.amount_minor)<=0)return Response.json({error:"A receipt is available only for a confirmed payment on your account."},{status:404});
 const {data:profile}=await service.from("student_profiles").select("full_name").eq("id",user.id).maybeSingle();
 const pdf=await buildInvoicePdf(orderReceipt(order,user,profile||{}),await getDocumentSettings());
 return new Response(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="receipt-'+order.id+'.pdf"',"Cache-Control":"private, no-store"}});
}
