'use client'

import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import clsx from 'clsx'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={clsx(
      'fixed inset-0 z-[70] bg-[#14213d]/35 transition-opacity duration-300 ease-out data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

type SheetSide = 'top' | 'right' | 'bottom' | 'left'

const sideClasses: Record<SheetSide, string> = {
  top: 'left-2 right-2 top-2 max-h-[calc(100dvh-1rem)] data-[state=open]:translate-y-0 data-[state=closed]:-translate-y-5',
  right:
    'bottom-2 right-2 top-2 w-[min(22rem,calc(100vw-1rem))] max-w-full data-[state=open]:translate-x-0 data-[state=closed]:translate-x-5',
  bottom:
    'bottom-2 left-2 right-2 max-h-[calc(100dvh-1rem)] data-[state=open]:translate-y-0 data-[state=closed]:translate-y-5',
  left: 'bottom-2 left-2 top-2 w-[min(22rem,calc(100vw-1rem))] max-w-full data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-5',
}

type SheetContentProps = React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
  side?: SheetSide
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={clsx(
        'fixed z-[71] overflow-y-auto overscroll-contain rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-2xl transition-[transform,opacity] duration-300 ease-out data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
        sideClasses[side],
        className
      )}
      {...props}
    >
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('flex flex-col space-y-2 text-left', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={clsx('text-lg font-semibold text-[#14213d]', className)} {...props} />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={clsx('text-sm text-[#666666]', className)} {...props} />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}