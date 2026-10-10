"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import "./student-workspace.css";

const lessons = [
  {title:"Building your visual story",duration:"18 min",type:"CURRENT LESSON"},
  {title:"From prompt to cinematic frame",duration:"12 min",type:"UP NEXT"},
  {title:"Finding rhythm in your edit",duration:"16 min",type:"THEN EXPLORE"},
];
const days = [0,1,0,1,2,0,1,2,0,2,2,2,2,3];
const points = days.map((value,index)=>({x:14+index*44,y:148-value*34,value}));
function readGoal() {
  try {const value=Number(localStorage.getItem("avc-preview-weekly-goal"));return [3,5,7].includes(value)?value:5;}catch{return 5;}
}
function subscribeGoal(callback) {
  window.addEventListener("storage",callback);window.addEventListener("preview-goal",callback);
  return ()=>{window.removeEventListener("storage",callback);window.removeEventListener("preview-goal",callback);};
}
const serverGoal=()=>5;
const curve = points.reduce((path,point,index)=>index ? `${path} C ${point.x-22} ${points[index-1].y}, ${point.x-22} ${point.y}, ${point.x} ${point.y}` : `M ${point.x} ${point.y}`, "");

function Icon({name,...props}) {
  const paths={book:"M4 5h6a2 2 0 0 1 2 2v14a3 3 0 0 0-3-2H4z M20 5h-6a2 2 0 0 0-2 2v14a3 3 0 0 1 3-2h5z",check:"m6 12 4 4 8-9",award:"M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M8 14l-1 7 5-2 5 2-1-7",flame:"M13 3c1 5-4 6-4 9-2-1-2-3-2-3-6 8 1 13 5 12 8-1 8-9 1-18Z",bell:"M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8 M10 21h4",clock:"M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",arrow:"M5 12h14 m-5-5 5 5-5 5",play:"m9 5 10 7-10 7Z",target:"M20 12a8 8 0 1 1-8-8 M16 12a4 4 0 1 1-4-4 M12 12 21 3 M17 3h4v4",receipt:"M6 3h12v18l-3-2-3 2-3-2-3 2Z M9 8h6 M9 12h6",spark:"m12 3 2 6 7 3-7 2-2 7-2-7-7-2 7-3Z"};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.spark}/></svg>;
}
function Ring({value=65,gold=false,children}) {
  return <span className={`sw-ring ${gold?"sw-ring-gold":""}`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle className="sw-ring-fill" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${value} 100`}/></svg><span>{children||`${value}%`}</span></span>;
}

export default function StudentWorkspacePreview() {
  const [active,setActive]=useState(13);
  const goal=useSyncExternalStore(subscribeGoal,readGoal,serverGoal);
  const [draftGoal,setDraftGoal]=useState(5);
  const [notice,setNotice]=useState("");
  const [panel,setPanel]=useState("notifications");
  const [selectedLesson,setSelectedLesson]=useState(lessons[0]);
  const dialog=useRef(null);
  const opener=useRef(null);
  function open(kind,event,lesson) {
    opener.current=event.currentTarget;
    setPanel(kind);
    if(lesson)setSelectedLesson(lesson);
    if(kind==="goal") {
      let saved=goal;
      try {const stored=Number(localStorage.getItem("avc-preview-weekly-goal"));if([3,5,7].includes(stored))saved=stored;}catch{}
      setDraftGoal(saved);
    }
    dialog.current.showModal();
    requestAnimationFrame(()=>dialog.current?.classList.add("is-open"));
  }
  function close() {
    const element=dialog.current;
    element.classList.remove("is-open");
    element.classList.add("is-closing");
    const delay=window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:150;
    setTimeout(()=>{element.close();element.classList.remove("is-closing");opener.current?.focus();},delay);
  }
  function saveGoal(event) {
    event.preventDefault();
    try{localStorage.setItem("avc-preview-weekly-goal",String(draftGoal));}catch{}
    window.dispatchEvent(new Event("preview-goal"));
    setNotice(`Your preview goal is set to ${draftGoal} lessons a week.`);close();
    setTimeout(()=>setNotice(""),5000);
  }
  return <div className="student-workspace">
    <header className="sw-header"><div><p className="sw-eyebrow">A LITTLE EVERY DAY. SOMETHING EXTRAORDINARY.</p><h1>Your workspace, organised.</h1><p>You’re making real progress. Keep going. <span className="sw-sun" aria-hidden="true">✳</span></p></div><div className="sw-header-tools"><span className="sw-sample"><i/> DESIGN REVIEW · SAMPLE DATA</span><button className="sw-bell" aria-label="View notifications" onClick={event=>open("notifications",event)}><Icon name="bell"/><i/></button></div></header>
    <section className="sw-stats" aria-label="Your learning at a glance">
      <button className="sw-stat" onClick={event=>open("courses",event)}><span className="sw-stat-top">Courses in progress<Icon name="book"/></span><span className="sw-stat-bottom"><strong>2</strong><span className="sw-trend">↗ Moving forward</span></span><span className="sw-stat-caption">Two paths. Endless possibilities.</span></button>
      <button className="sw-stat" onClick={()=>document.getElementById("sw-momentum").scrollIntoView({block:"center"})}><span className="sw-stat-top">Lessons completed<Icon name="check"/></span><span className="sw-stat-bottom"><strong>18</strong><Ring value={75}>75<span className="sw-percent">%</span></Ring></span><span className="sw-stat-caption">Every lesson is a step closer.</span></button>
      <button className="sw-stat sw-stat-gold" onClick={event=>open("certificates",event)}><span className="sw-stat-top">Certificates earned<Icon name="award"/></span><span className="sw-stat-bottom"><strong>1</strong><span className="sw-achievement"><Icon name="spark"/> Well earned</span></span><span className="sw-stat-caption">A milestone worth celebrating.</span></button>
      <button className="sw-stat sw-stat-streak" onClick={event=>open("goal",event)}><span className="sw-stat-top">Current streak<Icon name="flame"/></span><span className="sw-stat-bottom"><strong>5 <small>days</small></strong><span className="sw-flame"><Icon name="flame"/></span></span><span className="sw-stat-caption">You’re building something good.</span></button>
    </section>
    <div className="sw-columns"><div className="sw-primary">
      <section className="sw-continue sw-card"><div className="sw-continue-copy"><p className="sw-eyebrow"><i/> CONTINUE LEARNING</p><span className="sw-course-label">YOUR NEXT GREAT CREATION STARTS HERE</span><h2>AI filmmaking</h2><p className="sw-module">Module 3 · Building your visual story</p><div className="sw-progress-label"><strong>65% complete</strong><span><Icon name="clock"/>18 min left</span></div><div className="sw-progress" role="progressbar" aria-label="AI filmmaking course completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={65}><span style={{width:"65%"}}/></div><div className="sw-resume"><button className="sw-primary-button" onClick={event=>open("lesson",event,lessons[0])}>Continue Lesson <Icon name="arrow"/></button><span>Pick up exactly where<br/>you left off</span></div></div><div className="sw-film-art" aria-hidden="true"><span className="sw-film-orbit"/><div className="sw-film-frame sw-film-back"/><div className="sw-film-frame sw-film-front"><span>FRAME / 003</span><div className="sw-art-sun"/><div className="sw-art-hill"/><span className="sw-art-play"><Icon name="play"/></span></div><span className="sw-art-caption">MAKE YOUR VISION REAL.</span></div></section>
      <section className="sw-card sw-analytics" id="sw-momentum"><div className="sw-section-title"><div><h2>Your Learning Momentum</h2><p>Small steps are adding up to something big.</p></div><span className="sw-period">Last 14 days <span aria-hidden="true">⌁</span></span></div><div className="sw-chart-key"><span><i/> Lessons completed</span><strong>18 <small>in the last 14 days</small></strong></div><div className="sw-chart"><div className="sw-y-axis"><span>4</span><span>2</span><span>0</span></div><div className="sw-plot"><svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sw-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#668c63" stopOpacity=".25"/><stop offset="100%" stopColor="#668c63" stopOpacity=".01"/></linearGradient></defs>{[12,80,148].map(y=><line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e5e7df" strokeDasharray="3 5"/>)}<path d={`${curve} L 586 160 L 14 160 Z`} fill="url(#sw-area)"/><path d={curve} fill="none" stroke="#426f50" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/><line x1={points[active].x} x2={points[active].x} y1="12" y2="160" stroke="#8da38a" strokeDasharray="3 4"/></svg>{points.map((point,index)=><button key={index} className={`sw-chart-dot ${active===index?"is-active":""}`} style={{left:`${point.x/600*100}%`,top:`${point.y/180*100}%`}} aria-label={`${index<9?"September "+(22+index):"October "+(index-8)}: ${point.value} lessons completed`} onMouseEnter={()=>setActive(index)} onFocus={()=>setActive(index)} onClick={()=>setActive(index)}><span/>{active===index&&<span className="sw-chart-tooltip" role="tooltip">{index<9?"Sep "+(22+index):"Oct "+(index-8)}<strong>{point.value} {point.value===1?"lesson":"lessons"}</strong></span>}</button>)}</div></div><div className="sw-x-axis"><span>Sep 22</span><span>Sep 25</span><span>Sep 28</span><span>Oct 1</span><span>Oct 5</span></div><p className="sw-insight"><span>↗</span> You’re <strong>23% more consistent</strong> than last week <Icon name="spark"/></p></section>
      <section className="sw-card sw-activity"><div className="sw-section-title"><h2>A little progress, every day</h2><span className="sw-muted">Recent activity</span></div><ol>{[{icon:"check",title:"Completed Lesson 7",detail:"AI filmmaking · The art of visual direction",time:"Today, 10:42 AM"},{icon:"award",title:"Unlocked your first certificate",detail:"AI image creation · A new skill, made official",time:"Yesterday"},{icon:"play",title:"Watched Module Intro",detail:"AI filmmaking · Building your visual story",time:"2 days ago"}].map(item=><li key={item.title}><span className={`sw-activity-icon ${item.icon==="award"?"is-gold":""}`}><Icon name={item.icon}/></span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></li>)}</ol></section>
    </div><div className="sw-secondary">
      <section className="sw-motivation sw-card"><span className="sw-motivation-label"><Icon name="spark"/> LOOK AT YOU GROW</span><div className="sw-growth-art" aria-hidden="true">{[25,42,58,77,100].map((height,index)=><span key={height} style={{height:`${height}%`}}><i/>{index===4&&<b>✦</b>}</span>)}<i className="sw-growth-line"/></div><h2>You’re in the <em>top 12%</em><br/>of learners this month</h2><p>That’s your curiosity turning into commitment. Keep showing up — it’s working.</p><span className="sw-keep">YOUR FUTURE SELF THANKS YOU <span aria-hidden="true">↗</span></span></section>
      <section className="sw-card sw-milestone"><div className="sw-section-title"><h2>Your next milestone</h2><span className="sw-gold-icon"><Icon name="award"/></span></div><div className="sw-milestone-content"><Ring value={75} gold><Icon name="award"/></Ring><div><strong>So close to<br/>your next chapter.</strong><p>Only <b>4 lessons left</b> to earn your next certificate</p></div></div><button className="sw-subtle-button" onClick={event=>open("certificates",event)}>See your achievements <Icon name="arrow"/></button></section>
      <section className="sw-card sw-quick"><h2>Make your next move</h2><div><Link href="/courses"><Icon name="book"/>Browse all courses<span>↗</span></Link><button onClick={event=>open("certificates",event)}><Icon name="award"/>View certificates<span>↗</span></button><button onClick={event=>open("receipts",event)}><Icon name="receipt"/>Download receipts<span>↗</span></button><button onClick={event=>open("goal",event)}><Icon name="target"/>Set weekly goal<span>↗</span></button></div><p>{goal} lessons a week. A little structure, a lot of possibility.</p></section>
      <section className="sw-card sw-upcoming"><div className="sw-section-title"><h2>Up next for you</h2><span className="sw-muted">Module 3</span></div>{lessons.map((lesson,index)=><button key={lesson.title} onClick={event=>open("lesson",event,lesson)}><span className="sw-lesson-number">{String(index+8).padStart(2,"0")}</span><span><strong>{lesson.title}</strong><small>{lesson.duration} · Video lesson</small></span><Icon name="play"/></button>)}</section>
    </div></div>
    <footer className="sw-footer"><span><Icon name="spark"/> Progress isn’t always loud. Sometimes it’s just pressing play.</span><span>KEEP CREATING.</span></footer>
    <p className="sw-notice" role="status">{notice}</p>
    <dialog className="sw-dialog t-modal" ref={dialog} aria-labelledby="sw-dialog-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===dialog.current)close();}}><div className="sw-dialog-inner"><button className="sw-dialog-close" aria-label="Close dialog" onClick={close}>×</button><p className="sw-eyebrow">DESIGN REVIEW · SAMPLE DATA</p><h2 id="sw-dialog-title">{({goal:"Make room for your creativity.",notifications:"A little encouragement.",courses:"Two creative paths.",certificates:"Celebrate how far you’ve come.",receipts:"Your payment documents.",lesson:selectedLesson.title})[panel]}</h2>
      {panel==="goal"?<form onSubmit={saveGoal}><p>Choose a weekly rhythm that works for you. This preference is saved on this browser for the preview.</p><fieldset><legend>Lessons per week</legend>{[3,5,7].map(value=><label key={value}><input type="radio" name="goal" value={value} checked={draftGoal===value} onChange={()=>setDraftGoal(value)}/><strong>{value} lessons</strong><span>{value===3?"A gentle start":value===5?"Steady momentum":"Make it a daily habit"}</span></label>)}</fieldset><button className="sw-primary-button" type="submit">Save my goal <Icon name="check"/></button></form>:panel==="lesson"?<><p>{selectedLesson.duration} · AI filmmaking · Module 3</p><div className="sw-lesson-preview"><Icon name="play"/><span>Lesson outline preview</span></div><p>Explore visual storytelling: choose your focal point, plan a three-shot sequence and connect each frame to the story you want to tell.</p><p className="sw-muted">This design preview does not include a playable lesson or change your course progress.</p><Link href="/courses" className="sw-primary-button">Explore available courses <Icon name="arrow"/></Link></>:panel==="certificates"?<><p>You’ve completed AI image creation. Your next milestone is just four lessons away.</p><div className="sw-dialog-award"><Icon name="award"/><strong>AI image creation</strong><span>Sample achievement · Completed</span></div><Link className="sw-primary-button" href="/design-review">Preview certificate design <Icon name="arrow"/></Link></>:panel==="receipts"?<><p>Paid course orders will have a downloadable receipt in your learning dashboard. This sample workspace has no real transactions.</p><Link className="sw-primary-button" href="/design-review">Preview receipt design <Icon name="arrow"/></Link></>:panel==="courses"?<><p>AI filmmaking · 65% complete</p><p>AI creative direction · 25% complete</p><Link className="sw-primary-button" href="/courses">Browse all courses <Icon name="arrow"/></Link></>:<><p><strong>Your first certificate is ready.</strong><br/>A new skill deserves a moment of celebration.</p><p><strong>You’re on a five-day streak.</strong><br/>One more lesson keeps your momentum going.</p><p className="sw-muted">Sample notifications for this design preview.</p></>}
    </div></dialog>
  </div>;
}
