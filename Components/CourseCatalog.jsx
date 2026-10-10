"use client";
import { Children, useState } from "react";

export default function CourseCatalog({ courses, children }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All courses");
  const categories = ["All courses", ...new Set(courses.map(course=>course.category))];
  const cards = Children.toArray(children);
  const matches = courses.map((course,index)=>({course,card:cards[index]})).filter(({course})=>
    (category==="All courses"||course.category===category)&&
    (course.title+" "+course.description+" "+course.category).toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className="catalog-toolbar"><div className="catalog-categories" aria-label="Filter courses">{categories.map(item=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      <label className="catalog-search"><span>Search courses</span><input type="search" placeholder="What do you want to learn?" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    </div>
    <p className="catalog-result-count" role="status">{matches.length} course{matches.length===1?"":"s"}{query.trim()?" matching your search":" to explore"}</p>
    {matches.length?<div className="course-grid">{matches.map(({card})=>card)}</div>:<div className="catalog-empty"><h3>{courses.length?"No courses found.":"New courses are on the way."}</h3><p>{courses.length?"Try another topic or clear your filters.":"Come back soon to find your next creative project."}</p>{courses.length>0&&<button type="button" className="button button-secondary" onClick={()=>{setQuery("");setCategory("All courses");}}>Clear filters</button>}</div>}
  </>;
}
