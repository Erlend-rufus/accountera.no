export type RadioOption = { value: string; label: string };

type Props = {
  legend: string;
  name: string;
  options: readonly RadioOption[];
  value: string;
  onChange: (value: string) => void;
};

/** Radioknapper i en `fieldset`. Trykkflate minst 44 px, synlig fokusring på hvert valg. */
export function RadioGroup({ legend, name, options, value, onChange }: Props) {
  return (
    <fieldset className="ds-field ds-radio-group">
      <legend className="ds-field__label">{legend}</legend>
      <div className="ds-radio-group__options">
        {options.map((o) => (
          <label key={o.value} className="ds-radio">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="ds-radio__dot" aria-hidden="true" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
