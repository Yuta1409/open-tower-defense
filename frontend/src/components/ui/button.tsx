import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-pixel text-xs transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--surface2)] text-[var(--text)] border-2 border-[var(--border)] hover:border-[var(--green)] hover:text-[var(--green)] hover:shadow-[0_0_10px_rgba(0,255,65,0.4)]',
        green:
          'bg-transparent text-[var(--green)] border-2 border-[var(--green)] hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_15px_rgba(0,255,65,0.5)]',
        red:
          'bg-transparent text-[var(--red)] border-2 border-[var(--red)] hover:bg-[rgba(255,34,68,0.1)] hover:shadow-[0_0_15px_rgba(255,34,68,0.5)]',
        gold:
          'bg-transparent text-[var(--gold)] border-2 border-[var(--gold)] hover:bg-[rgba(255,215,0,0.1)] hover:shadow-[0_0_15px_rgba(255,215,0,0.5)]',
        ghost: 'bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]',
      },
      size: {
        sm: 'px-3 py-1 text-[0.5rem]',
        default: 'px-4 py-2 text-xs',
        lg: 'px-6 py-3 text-sm',
        xl: 'px-8 py-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
