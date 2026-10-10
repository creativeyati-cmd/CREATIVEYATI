import SettingsNavigation from "@/Components/SettingsNavigation";
import { Input, Textarea } from "@/Components/FormControls";
import { PageHeader } from "@/Components/DashboardPageShell";
import SubmitButton from "@/Components/SubmitButton";
import { getDocumentSettings } from "@/lib/data/settings";
import { saveDocumentSettings } from "@/app/admin/actions";
export default async function DocumentSettings({searchParams}) {
 const [brand,query]=await Promise.all([getDocumentSettings(),searchParams]);
 return <><PageHeader title={<>Receipts & certificates</>} eyebrow={<>SETTINGS</>} description={<>One identity for client receipts, student receipts and course certificates. Details appear on the document and its PDF.</>}/><SettingsNavigation/>{query.saved&&<p className="success-note" role="status">Document details saved.</p>}{query.error&&<p className="form-error" role="alert">{query.error}</p>}<form className="admin-form" action={saveDocumentSettings}>{[["businessName","Business name"],["academyName","Certificate brand"],["email","Business email"],["phone","Phone"],["address","Address"],["signerName","Certificate signer"],["signerTitle","Signer title"]].map(([name,label])=><label key={name}>{label}<Input name={name} defaultValue={brand[name]} maxLength={150} required={["businessName","academyName"].includes(name)}/></label>)}<label className="form-wide">Payment instructions<Textarea name="paymentInstructions" defaultValue={brand.paymentInstructions} maxLength={500}/><small>Only supply real account details. Paid receipts show a payment confirmation instead.</small></label><SubmitButton pendingLabel="Saving...">Save document details</SubmitButton></form></>;
}
