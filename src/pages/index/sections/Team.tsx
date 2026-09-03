import { team } from '../../../content/site';

/** Uten portretter. Bilder av de ansatte finnes ikke. */
export function Team() {
  return (
    <section className="sec" aria-labelledby="team-title">
      <div className="ds-container team__grid">
        <h2 id="team-title" className="ds-h2">
          {team.heading[0]}
          <br />
          {team.heading[1]}
        </h2>
        <p>{team.body}</p>
      </div>
    </section>
  );
}
