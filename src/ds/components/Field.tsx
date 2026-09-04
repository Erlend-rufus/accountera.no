import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

type FieldShell = {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  optionalLabel?: string;
  error?: string;
};

function Shell({
  id,
  label,
  hint,
  optional,
  optionalLabel = 'valgfritt',
  error,
  children,
}: FieldShell & { children: ReactNode }) {
  return (
    <div className={['ds-field', error ? 'ds-field--error' : ''].filter(Boolean).join(' ')}>
      <label className="ds-field__label" htmlFor={id}>
        {label}
        {optional && <span className="ds-field__optional">({optionalLabel})</span>}
      </label>
      {hint && (
        <p className="ds-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="ds-field__error" id={`${id}-error`}>
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

type InputProps = FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

/** Tekstfelt. Feil uten rødt: tekst, ikon og tykkere strek. */
export function Input({ id, label, hint, optional, optionalLabel, error, ...rest }: InputProps) {
  return (
    <Shell id={id} label={label} hint={hint} optional={optional} optionalLabel={optionalLabel} error={error}>
      <input
        id={id}
        className="ds-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Shell>
  );
}

type SelectProps = FieldShell & {
  options: readonly string[];
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>;

/** Nedtrekk med «Velg» som tom verdi. */
export function Select({ id, label, hint, optional, optionalLabel, error, options, placeholder = 'Velg', value, ...rest }: SelectProps) {
  return (
    <Shell id={id} label={label} hint={hint} optional={optional} optionalLabel={optionalLabel} error={error}>
      <div className="ds-select">
        <select
          id={id}
          className="ds-control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          data-empty={value === '' || value === undefined ? 'true' : undefined}
          value={value}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="ds-select__chev" />
      </div>
    </Shell>
  );
}

type TextareaProps = FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function Textarea({ id, label, hint, optional, optionalLabel, error, ...rest }: TextareaProps) {
  return (
    <Shell id={id} label={label} hint={hint} optional={optional} optionalLabel={optionalLabel} error={error}>
      <textarea
        id={id}
        className="ds-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </Shell>
  );
}
