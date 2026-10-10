export const escapeHtml=(s="")=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function communityValues(input={}){
 const whatsapp=String(input.whatsapp||'').trim(),telegram=String(input.telegram||'').trim();
 if(whatsapp&&(!safeUrl(whatsapp)||new URL(whatsapp).hostname!=='chat.whatsapp.com'))throw new Error('Use a https://chat.whatsapp.com group invitation.');
 if(telegram&&(!safeUrl(telegram)||!['t.me','telegram.me'].includes(new URL(telegram).hostname)))throw new Error('Use a https://t.me Telegram invitation.');
 return {name:String(input.name||'').slice(0,160),welcome:String(input.welcome||'').slice(0,3000),whatsapp,telegram,enabled:input.enabled===true};
}
export function emailHtml(body,vars={}){
 const value=String(body).replace(/\{\{(student_name|course_title)\}\}/g,(_,key)=>String(vars[key]|| (key==='student_name'?'Student':'your course')));
 function inline(line){return escapeHtml(line).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/_([^_]+)_/g,'<em>$1</em>').replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,(_,label,url)=>safeUrl(url)?`<a href="${url}">${label}</a>`:label);}
 const content=value.split('\n').map(line=>{
 const special=line.match(/^(!|CTA:)\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/);
 if(special){const url=safeUrl(special[3]);if(!url)return '';return special[1]==='!'?`<img src="${escapeHtml(url)}" alt="${escapeHtml(special[2])}" style="max-width:100%;height:auto"/>`:`<p><a style="display:inline-block;background:#174c38;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none" href="${escapeHtml(url)}">${escapeHtml(special[2])}</a></p>`;}
 return line.startsWith('## ')?`<h2>${inline(line.slice(3))}</h2>`:line?`<p>${inline(line.startsWith('- ')?'? '+line.slice(2):line)}</p>`:'';
 }).join('');
 return `<!doctype html><html><body style="margin:0;background:#f6f8f6;color:#243a2f;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;background:#fff;padding:28px;line-height:1.6"><p style="font-weight:bold">AI VIDEO CREATOR</p>${content}</main></body></html>`;
}
