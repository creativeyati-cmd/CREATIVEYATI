import {PageHeader} from '@/Components/DashboardPageShell';
import CommunicationHistory from '@/Components/CommunicationHistory';
export default function Page(){return <><PageHeader title="Communication history" eyebrow="COMMUNICATIONS" description="Queue status, delivery attempts and audit records."/><CommunicationHistory/></>;}
