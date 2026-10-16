import { ExternalLink } from "lucide-react";
import type { Heritage } from "../lib/types";

export function HeritagePhoto({ site }: { site: Heritage }) {
  if (!site.photo)
    return (
      <div className="profile-heading-art">
        <span>{site.period}</span>
        <strong>{site.name}</strong>
        <small>ARCHITECTURE & THE CITY</small>
      </div>
    );
  return (
    <figure className="heritage-photo">
      <img
        src={`${import.meta.env.BASE_URL}${site.photo.path}`}
        alt={site.name}
        loading="lazy"
      />
      <figcaption>
        <a href={site.photo.page} target="_blank" rel="noreferrer">
          Photo: {site.photo.author}
        </a>{" "}
        ·{" "}
        <a href={site.photo.licenceUrl} target="_blank" rel="noreferrer">
          {site.photo.licence}
        </a>
      </figcaption>
    </figure>
  );
}
export function HeritageDetails({ site }: { site: Heritage }) {
  return (
    <>
      <dl className="facts">
        {site.facts?.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>
              {f.value}{" "}
              <a
                className="citation"
                href={site.sources?.[f.source]?.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Source for ${f.label}`}
              >
                [{f.source + 1}]
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <div className="architect-reading">
        <h3>Read it as an architect</h3>
        <p>{site.reading}</p>
        <small>Editorial spatial interpretation</small>
      </div>
      <h3>Sources & further reading</h3>
      <ol className="profile-sources">
        {site.sources?.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title} <ExternalLink size={12} />
            </a>
            <small>
              {s.checked.startsWith("20")
                ? `Retrieved ${s.checked}`
                : s.checked}
            </small>
          </li>
        ))}
      </ol>
    </>
  );
}
