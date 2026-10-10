import { LoadingToast } from "@/Components/ToastHost";
import { SkeletonTable } from "@/Components/Feedback";
export default function Loading(){return <section aria-busy="true"><LoadingToast message="Loading your workspace?" /><p>Loading your workspace...</p><SkeletonTable/></section>;}
