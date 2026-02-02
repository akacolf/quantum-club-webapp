import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { TextClassContext } from '~/components/ui/text';
import { cn } from '~/lib/utils';

const Card = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, style, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'rounded-3xl border border-border bg-card shadow-sm shadow-foreground/10',
        className
      )}
      style={[{ borderRadius: 20, borderCurve: 'continuous' }, style]}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <TextClassContext.Provider value='text-2xl text-card-foreground font-semibold leading-none tracking-tight'>
      <View ref={ref} className={cn('', className)} {...props} />
    </TextClassContext.Provider>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <TextClassContext.Provider value='text-sm text-muted-foreground'>
      <View ref={ref} className={cn('', className)} {...props} />
    </TextClassContext.Provider>
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<React.ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('flex flex-row items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
