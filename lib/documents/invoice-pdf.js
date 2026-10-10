import { PDFDocument } from "pdf-lib";
import { documentDefaults, documentDate, documentMoney, documentTitle } from "./brand.js";
import { documentFonts, ink, paper, rule, fit, wrap } from "./pdf-layout.js";
export async function buildInvoicePdf(invoice, branding = {}) {
  const brand={...documentDefaults,...branding}, pdf=await PDFDocument.create();
  const {body,bold}=await documentFonts(pdf), title=documentTitle(invoice);
  const money=(v)=>documentMoney(v,invoice.currency);
  let page,y;
  const text=(v,x,top,size=10,font=body)=>page.drawText(String(v||""),{x,y:top,size,font,color:ink});
  const line=(top)=>page.drawLine({start:{x:36,y:top},end:{x:559,y:top},thickness:.6,color:rule});
  const right=(v,x,top,width=105,font=body)=>{const size=fit(font,v,width,10);text(v,x-font.widthOfTextAtSize(v,size),top,size,font);};
  function addPage(first=false) {
    page=pdf.addPage([595.28,841.89]);page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:paper});
    text(title,34,first?724:772,first?82:32,bold);
    right(documentDate(invoice.status==="paid" ? invoice.paidAt || invoice.issuedAt : invoice.issuedAt),559,first?740:790,160);
    right(invoice.receipts?.[0]?.receiptNumber || invoice.number,559,first?723:772,160,bold);
    line(first?682:752);
    if(first) {
      text(invoice.status==="paid"?"Received from:":"Billed to:",36,658,11,bold);let billY=635;
      for(const value of [invoice.clientCompany,invoice.clientName,invoice.clientEmail].filter(Boolean)) for(const part of wrap(body,value,11,520)){text(part,36,billY,11);billY-=16;}
      line(billY-6);y=Math.min(474,billY-42);
    }else y=722;
    line(y+18);text("Description",36,y,10,bold);right("Rate",365,y,90,bold);right("Qty",426,y,42,bold);right("Amount",559,y,120,bold);line(y-10);y-=30;
    text(brand.businessName,36,25,8);right(invoice.number+" / "+pdf.getPageCount(),559,25,220);
  }
  addPage(true);
  for(const item of invoice.items) {
    let firstLine=true;
    for(const part of wrap(body,item.description,10,235)) {
      if(y<80)addPage();text(part,36,y);
      if(firstLine){right(money(item.unitPriceMinor),365,y,85);right(String(item.quantity),426,y,45);right(money(Math.round(item.unitPriceMinor*item.quantity)),559,y,120);firstLine=false;}
      y-=15;
    }
    line(y+3);y-=19;
  }
  if(y<270)addPage();
  for(const [label,value] of [["Subtotal",money(invoice.subtotalMinor)],...(invoice.discountMinor>0?[["Discount","-"+money(invoice.discountMinor)]]:[]),[invoice.status==="paid"?"Amount paid":"Total",money(invoice.totalMinor)]]) {
    text(label,350,y,11,bold);right(value,559,y,110,bold);y-=26;
  }
  text("Status: "+invoice.status,36,y,9);if(invoice.dueAt)right("Due "+documentDate(invoice.dueAt),559,y,190);y-=28;
  for(const receipt of invoice.receipts||[]){if(y<95)addPage();text("Receipt "+receipt.receiptNumber+" / "+documentDate(receipt.issuedAt),36,y,9);y-=17;}
  for(const part of wrap(body,invoice.notes||"",9,520)){if(y<95)addPage();text(part,36,y,9);y-=13;}
  const payment=wrap(body,invoice.status==="paid" ? "Payment received. Thank you."+ (invoice.paymentChannel ? "\nMethod: "+invoice.paymentChannel : "") : brand.paymentInstructions || "Use the secure payment link supplied with this invoice.",10,260);
  const business=[brand.address,brand.phone,brand.email].filter(Boolean).flatMap(v=>wrap(body,v,10,235));
  const footerHeight=Math.max(payment.length,business.length)*14+50;
  if(y<footerHeight+65)addPage();
  const footerY=Math.min(y-30,Math.max(155,footerHeight+40));line(footerY+23);text("Payment information",36,footerY,11,bold);text(brand.businessName,324,footerY,11,bold);
  payment.forEach((v,i)=>text(v,36,footerY-25-i*14));business.forEach((v,i)=>text(v,324,footerY-25-i*14));
  pdf.setTitle(title+" "+invoice.number);pdf.setAuthor(brand.businessName);return pdf.save();
}
