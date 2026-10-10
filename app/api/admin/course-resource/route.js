import {getAdminUser} from "@/lib/supabase/server";
export async function POST(){if(!await getAdminUser())return Response.json({error:"Administrator access required."},{status:401});return Response.json({error:"Reopen the course workspace to upload resources to the private draft."},{status:409});}
