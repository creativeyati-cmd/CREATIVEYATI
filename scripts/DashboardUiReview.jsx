import ConfirmActionForm from "@/Components/ConfirmActionForm";
import Link from "next/link";
import { PageHeader, Card } from "@/Components/DashboardPageShell";
import { Input, Select, Textarea, Button } from "@/Components/FormControls";
import DataTable from "@/Components/DataTable";
import Badge from "@/Components/Badge";
import Drawer from "@/Components/Drawer";
import Tabs from "@/Components/Tabs";
import { EmptyState } from "@/Components/Feedback";
import { MetricCard } from "@/Components/WorkspaceParts";

export default function DashboardUiReview({ student = false, action }) {
 return <><PageHeader title={student ? "My courses" : "Projects"} eyebrow={student ? "MY LEARNING" : "STUDIO"} description="Development fixture · shared production components." actions={<><Link className="button" href="#form">{student ? "Browse courses" : "Add project"}</Link><Link className="button button-secondary" href="#records">View records</Link></>}/>
 <section className="dashboard-metrics"><MetricCard label="Published" value="24" caption="Available now" icon="book"/><MetricCard label="In progress" value="4" caption="Current work" icon="people"/><MetricCard label="Certificates" value="12" caption="Issued" icon="award" gold/><MetricCard label="Collected" value="₦850,000" caption="NGN only" icon="wallet"/></section>
 <Tabs basePath="/design-review" current="" keep={{ view: student ? "ui-student" : "ui-admin" }} items={[{value:"",label:"All",count:25},{value:"published",label:"Published"}]}/>
 <div id="records"><DataTable label="Projects"><div><b>Title</b><b>Owner</b><b>Amount</b><b>Status</b><b>Actions</b></div>{Array.from({length:25},(_,i)=><div key={i}><strong>{i === 0 ? "An unusually long project title that must wrap without stretching the page" : `Project ${i+1}`}</strong><span>Idayat Ibrahim<small>learner@example.com</small></span><span>₦35,000</span><Badge tone={i%2 ? "warning":"success"}>{i%2 ? "draft":"published"}</Badge><Drawer label={`Project ${i+1}`} trigger="View details"><p>Production drawer component.</p><form className="admin-form"><label>Title<Input defaultValue={`Project ${i+1}`}/></label><Button type="button">Save changes</Button></form></Drawer></div>)}</DataTable></div>
 <Card id="form"><h2>Project details</h2><form className="admin-form"><label>Title<Input name="title" placeholder="Enter a title" required/></label><label>Status<Select name="status"><option>Draft</option><option>Published</option></Select></label><label className="form-wide">Description<Textarea rows={3} name="description"/></label><label>Publish date<Input type="date"/></label><label>Cover image<Input type="file" accept="image/*"/></label><label>Unavailable field<Input disabled value="Managed by your account"/></label><label className="check-label"><Input type="checkbox"/> Featured</label><div className="row-actions form-wide"><Button type="button">Save changes</Button><Button type="button" variant="secondary">Cancel</Button><Button type="button" variant="danger">Delete</Button></div></form></Card>
 <ConfirmActionForm action={action} fields={{id:"fixture"}} label="Delete sample" className="danger-action" confirmText="Delete this sample record?"/><EmptyState title="No matching records">Try another search or clear your filters.</EmptyState></>;
}
