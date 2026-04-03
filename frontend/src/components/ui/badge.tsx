import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 font-pixel text-[0.45rem] transition-colors',
  {
    variants: {
      variant: {
        default: 'border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)]',
        green: 'border border-[var(--green)] text-[var(--green)] bg-[rgba(0,255,65,0.1)]',
        gold: 'border border-[var(--gold)] text-[var(--gold)] bg-[rgba(255,215,0,0.1)]',
        red: 'border border-[var(--red)] text-[var(--red)] bg-[rgba(255,34,68,0.1)]',
        blue: 'border border-[var(--blue)] text-[var(--blue)] bg-[rgba(68,136,255,0.1)]',
        purple: 'border border-[var(--purple)] text-[var(--purple)] bg-[rgba(170,68,255,0.1)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
