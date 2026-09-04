import Link from "next/link";
import ProjectMedia from "./ProjectMedia";
import { AdminIcon } from "./Icons";

export default function WorkGrid({ videos }) {
  return <div className="work-grid">
    {videos.map((video, index) => <article className="work-card" key={video.id}>
      <Link href={`/work/${video.slug}`} aria-label={`View ${video.title}`}>
        <ProjectMedia project={video} context="project-page" priority={index < 3} />
        <div className="work-card-copy">
          {video.category?.name && <span>{video.category.name}</span>}
          <h2>{video.title}</h2>
          {video.shortDescription && <p>{video.shortDescription}</p>}
          <small>View project <AdminIcon name="arrow" /></small>
        </div>
      </Link>
    </article>)}
  </div>;
}
