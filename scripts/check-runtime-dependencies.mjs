import assert from "node:assert/strict";
import sharp from "sharp";
import nodemailer from "nodemailer";

const source = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#ab8866" } }).png().toBuffer();
for (const format of ["webp", "avif"]) {
  const output = await sharp(source).resize(10, 5).toFormat(format).toBuffer();
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 10);
  assert.equal(metadata.height, 5);
}
// Compose MIME locally; this transport never connects to SMTP or sends email.
const transport = nodemailer.createTransport({streamTransport:true,buffer:true,newline:"unix"});
const result = await transport.sendMail({
  from:{name:"AI VIDEO CREATOR",address:"academy@example.test"},
  to:"student@example.test",replyTo:"support@example.test",
  subject:"Receipt sample",text:"Payment received.",html:"<p>Payment received.</p>",
});
assert.deepEqual(result.envelope.to, ["student@example.test"]);
assert.match(result.message.toString(), /Subject: Receipt sample/);
assert.match(result.message.toString(), /Payment received/);
transport.close();
console.log("Passed: Sharp resize/WebP/AVIF and local Nodemailer MIME composition (no delivery).");
