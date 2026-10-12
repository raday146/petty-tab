import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import s from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props): ReactNode {
  return (
    <button type={type} className={cx(s.btn, variant === 'outline' && s.outline, className)} {...rest} />
  );
}
