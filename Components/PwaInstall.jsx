"use client";
import {useEffect,useState} from "react";
export default function PwaInstall(){
 const [prompt,setPrompt]=useState(null);const [installed,setInstalled]=useState(false);const [help,setHelp]=useState(false);
 useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).catch(()=>{});const onPrompt=e=>{e.preventDefault();setPrompt(e);};const done=()=>{setInstalled(true);setPrompt(null);};window.addEventListener("beforeinstallprompt",onPrompt);window.addEventListener("appinstalled",done);if(window.matchMedia("(display-mode: standalone)").matches)done();return()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",done);};},[]);
 if(installed)return null;
 return <div className="pwa-install"><button type="button" onClick={async()=>{if(!prompt){setHelp(!help);return;}await prompt.prompt();await prompt.userChoice;setPrompt(null);}}>Install academy app</button>{help&&<p>On iPhone or iPad, use Safari ? Share ? Add to Home Screen. On supported desktop and Android browsers, choose Install app in the browser menu. Courses and videos require an internet connection.</p>}</div>;
}
