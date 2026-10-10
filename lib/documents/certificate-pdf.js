import { PDFDocument, rgb } from "pdf-lib";
import qrcode from "qrcode-generator";
import { documentDefaults, documentDate } from "./brand.js";
import { documentFonts, ink, paper, bronze, fit } from "./pdf-layout.js";
export async function buildCertificatePdf(certificate, branding={}) {
  const brand={...documentDefaults,...branding},pdf=await PDFDocument.create(),page=pdf.addPage([842,595]);
  const {body,bold,script,serif}=await documentFonts(pdf);
  page.drawRectangle({x:0,y:0,width:842,height:595,color:paper});
  for (const inset of [35, 43]) {
    const r = 22, right = 842 - inset, bottom = 595 - inset;
    const path = "M " + (inset+r) + " " + inset + " H " + (right-r) + " Q " + (right-r) + " " + (inset+r) + " " + right + " " + (inset+r) + " V " + (bottom-r) + " Q " + (right-r) + " " + (bottom-r) + " " + (right-r) + " " + bottom + " H " + (inset+r) + " Q " + (inset+r) + " " + (bottom-r) + " " + inset + " " + (bottom-r) + " V " + (inset+r) + " Q " + (inset+r) + " " + (inset+r) + " " + (inset+r) + " " + inset + " Z";
    page.drawSvgPath(path, { x: 0, y: 595, borderWidth: inset === 35 ? 2 : .5, borderColor: bronze });
  }
  page.drawRectangle({x:319,y:446,width:204,height:149,color:bronze});
  const centre=(value,font,size,y,maxWidth=700,color=ink)=>{const s=fit(font,value,maxWidth,size);page.drawText(value,{x:(842-font.widthOfTextAtSize(value,s))/2,y,size:s,font,color});};
  centre(brand.academyName,bold,16,497,178,rgb(1,1,1));centre("LEARN. CREATE. COMPLETE.",body,7,478,178,rgb(1,1,1));
  centre("CERTIFICATE",serif,65,360);centre("O F   C O M P L E T I O N",bold,12,326);centre("proudly presented to",body,11,298);
  const name=certificate.studentName||"Student",supported=new Set(script.getCharacterSet());
  centre(name,[...name].every(c=>supported.has(c.codePointAt(0)))?script:body,44,247,575);
  page.drawLine({start:{x:218,y:239},end:{x:624,y:239},color:bronze,thickness:.6});
  centre("for completing "+(certificate.courseTitle||"the course"),body,12,209,700);
  centre(certificate.lessonCount+" lessons / "+certificate.instructionMinutes+" minutes",body,9,190);
  page.drawCircle({x:421,y:121,size:44,color:bronze});page.drawCircle({x:421,y:121,size:38,borderColor:paper,borderWidth:1});
  centre("COMPLETED",bold,9,122,76,paper);centre("ACADEMY",body,7,108,65,paper);
  const text=(v,x,y,width=180)=>page.drawText(v,{x,y,font:body,size:fit(body,v,width,10),color:ink});
  page.drawLine({start:{x:102,y:117},end:{x:284,y:117},color:bronze,thickness:.6});
  text(brand.signerName||brand.businessName,102,101);text(brand.signerTitle,102,85);
  const verifyUrl=(process.env.NEXT_PUBLIC_SITE_URL||"https://aivideocreator.cv").replace(/\/$/,"")+certificate.verifyPath;
  const qr=qrcode(0,"M");qr.addData(verifyUrl);qr.make();const size=60/qr.getModuleCount();
  page.drawRectangle({x:651,y:91,width:68,height:68,color:rgb(1,1,1)});
  for(let row=0;row<qr.getModuleCount();row++)for(let col=0;col<qr.getModuleCount();col++)if(qr.isDark(row,col))page.drawRectangle({x:655+col*size,y:95+(qr.getModuleCount()-row-1)*size,width:size,height:size,color:ink});
  text(documentDate(certificate.issuedAt),560,77,175);text(certificate.serial,560,62,200);
  if(certificate.status!=="valid")centre("REVOKED - verify current status online",bold,13,172,650,rgb(.65,.1,.1));
  pdf.setTitle("Certificate "+certificate.serial);pdf.setAuthor(brand.academyName);return pdf.save();
}
