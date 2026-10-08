import { Card } from '../../ds';
import { prepare } from '../../content/site';

/** Delt mellom takkesiden og bekreftet-siden. `narrow` gir maks bredde 520 (bekreftet-siden). */
export function PrepareCard({ narrow }: { narrow?: boolean }) {
  return (
    <Card variant="outline" className={['prepare', narrow ? 'prepare--narrow' : ''].filter(Boolean).join(' ')}>
      <h2 className="ds-h3">{prepare.heading}</h2>
      <ul>
        {prepare.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Card>
  );
}
