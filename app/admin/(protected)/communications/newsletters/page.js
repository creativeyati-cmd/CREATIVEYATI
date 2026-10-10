import {PageHeader} from '@/Components/DashboardPageShell';
import CommunicationsManager from '@/Components/CommunicationsManager';
import {communicationData} from '@/lib/communications';
export default async function Page({searchParams}){const data=await communicationData('newsletter');const query=await searchParams;return <><PageHeader title="Newsletters" eyebrow="COMMUNICATIONS" description="Create, preview and manage academy emails."/><CommunicationsManager kind="newsletter" initial={data.campaigns} courses={data.courses} error={data.error} studentId={query.student||''}/></>;}
