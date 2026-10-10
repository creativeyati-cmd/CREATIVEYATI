import { LoadingToast } from "@/Components/ToastHost";
import { SkeletonTable } from "@/Components/Feedback";
export default function Loading(){return <section aria-busy="true"><LoadingToast message="Loading your learning?" /><p>Loading your learning...</p><SkeletonTable/></section>;}
