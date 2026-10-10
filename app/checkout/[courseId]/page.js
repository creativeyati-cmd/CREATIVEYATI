import { notFound, redirect } from "next/navigation";
import PublicHeader from "@/Components/PublicHeader";
import CheckoutForm from "@/Components/CheckoutForm";
import { getSiteContent } from "@/lib/data/site";
import { getPublicCourseById, coursePrice } from "@/lib/data/courses";
import { getStudentUser, createSupabaseServiceClient } from "@/lib/supabase/server";
export const metadata={title:"Complete your enrolment"};

export default async function CheckoutPage({params}) {
 const {courseId}=await params,user=await getStudentUser();
 if(!user)redirect("/login?next="+encodeURIComponent("/checkout/"+courseId));
 const [course,site]=await Promise.all([getPublicCourseById(courseId),getSiteContent()]);
 if(!course)notFound();
 const service=createSupabaseServiceClient();
 const {data:enrolment}=service?await service.from("enrolments").select("id").eq("student_id",user.id).eq("course_id",course.id).eq("active",true).maybeSingle():{data:null};
 if(enrolment)redirect("/learn/"+course.slug);
 const price=coursePrice(course);
 const modules=course.sections||[],lessons=modules.flatMap(module=>module.lessons||[]);
 return <main className="public-page reference-checkout"><PublicHeader site={site}/>
  <CheckoutForm courseId={course.id} email={user.email||""} verified={Boolean(user.email_confirmed_at)}
    currency={course.currency} amountMinor={price} isFree={price===0}
    course={{title:course.title,slug:course.slug,coverImageUrl:course.coverImageUrl,coverFocalX:course.coverFocalX,coverFocalY:course.coverFocalY,priceMinor:course.priceMinor,moduleCount:modules.length,lessonCount:lessons.length}}/>
 </main>;
}
