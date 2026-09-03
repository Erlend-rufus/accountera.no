import { BrandPattern } from '../../../ds';
import { how } from '../../../content/site';

export function How() {
  return (
    <section className="how ds-on-navy" aria-labelledby="how-title">
      <div className="how__band" aria-hidden="true">
        <BrandPattern />
      </div>
      <div className="sec">
        <div className="ds-container">
          <h2 id="how-title" className="ds-h2 sec__head">
            {how.heading}
          </h2>
          <ol className="how__grid" style={{ listStyle: 'none' }}>
            {how.steps.map((s, i) => (
              <li className="how__step" key={s.title}>
                <span className="ds-display-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="ds-h3">{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
