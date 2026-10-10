"use client";
import { useEffect, useState } from "react";
import CourseWorkspace from "@/Components/CourseWorkspace";
import {emptyCourse} from "@/lib/course-workspace";
import "@/Components/dashboard-ui.css";
const doc={...emptyCourse("00000000-0000-4000-8000-000000000099"),title:"Test course",slug:"test-course"};
const initial={document:doc,revision:1,userId:"fixture",status:"published"};
async function save(id,revision,document){window.testSaves=(window.testSaves || []);window.testSaves.push({id,revision,document});await new Promise(resolve=>setTimeout(resolve,400));if(window.testFail)return {ok:false,error:"Simulated save failure",conflict:window.testConflict};return {ok:true,revision:revision+1};}
export default function Review({httpSave=false}){const [snapshot,setSnapshot]=useState(httpSave ? {...initial,isNew:true,revision:0} : initial);useEffect(()=>{window.testRefreshServerProps=()=>setSnapshot(value=>structuredClone(value));return ()=>{delete window.testRefreshServerProps;};},[]);return <div className="admin-shell" style={{display:"block"}}><main className="admin-main dashboard-page" style={{padding:24,background:"white"}}><CourseWorkspace initial={snapshot} saveAction={httpSave ? undefined : save}/></main></div>;}
