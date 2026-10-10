export function courseState(item) {
 const lessons=item.course?.sections.flatMap(section=>section.lessons)||[];
 const ids=new Set(lessons.map(lesson=>lesson.id));
 const progress=item.progress.filter(entry=>ids.has(entry.lesson_id));
 const done=new Set(progress.filter(entry=>entry.completed).map(entry=>entry.lesson_id));
 const completed=done.size,percent=lessons.length?Math.round(completed/lessons.length*100):0;
 const recentProgress=[...progress].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at))[0];
 const recentLesson=lessons.find(lesson=>lesson.id===recentProgress?.lesson_id);
 const nextLesson=(recentLesson&&!done.has(recentLesson.id)?recentLesson:null)||lessons.find(lesson=>!done.has(lesson.id))||lessons[0];
 const resources=item.course?.sections.flatMap(section=>section.lessons.flatMap(lesson=>lesson.resources.map(resource=>({...resource,lessonTitle:lesson.title}))))||[];
 return {lessons,completed,percent,recentProgress,recentLesson,nextLesson,resources};
}
