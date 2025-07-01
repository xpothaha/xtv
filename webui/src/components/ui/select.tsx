import React, { useState, useRef, useEffect } from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  children?: React.ReactNode;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              ref: triggerRef,
              onClick: () => setIsOpen(!isOpen),
              isOpen,
              selectedValue
            });
          }
          if (child.type === SelectContent && isOpen) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onSelect: handleSelect
            });
          }
        }
        return child;
      })}
    </div>
  );
}

export const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps & {
  onClick?: () => void;
  isOpen?: boolean;
  selectedValue?: string;
}>(({ children, className = '', onClick, isOpen, selectedValue }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span>{selectedValue || 'Select option...'}</span>
      <svg
        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
});

export function SelectValue({ children }: SelectValueProps) {
  return <span>{children}</span>;
}

export function SelectContent({ children, onSelect }: SelectContentProps & { onSelect?: (value: string) => void }) {
  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === SelectItem) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: () => onSelect?.((child.props as any).value)
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ value, children, onClick }: SelectItemProps & { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
    >
      {children}
    </div>
  );
} 