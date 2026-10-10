export function orderReceipt(order, user, profile = {}) {
 const original=Number(order.original_amount_minor ?? order.amount_minor);
 return { number:"RCT-"+order.reference, status:"paid", documentType:"invoice",
 clientName:profile.full_name||user.user_metadata?.full_name||user.email,clientCompany:"",clientEmail:user.email,
 issuedAt:order.paid_at||order.created_at,paidAt:order.paid_at,currency:order.currency,
 subtotalMinor:original,discountMinor:Number(order.discount_minor)||0,totalMinor:Number(order.amount_minor),
 paymentChannel:order.payment_channel||order.gateway,
 items:[{id:order.id,description:order.courses?.title||"Course enrolment",quantity:1,unitPriceMinor:original}],
 receipts:[],notes:"Payment reference: "+order.reference };
}
