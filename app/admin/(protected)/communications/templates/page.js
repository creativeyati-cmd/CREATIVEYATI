import {PageHeader} from '@/Components/DashboardPageShell';
import CommunicationsManager from '@/Components/CommunicationsManager';
import {communicationData} from '@/lib/communications';
export default async function Page({searchParams}){const data=await communicationData('template');const query=await searchParams;return <><PageHeader title="Templates" eyebrow="COMMUNICATIONS" description="Create, preview and manage academy emails."/><CommunicationsManager kind="template" initial={data.campaigns} courses={data.courses} error={data.error} studentId={query.student||''}/></>;}
