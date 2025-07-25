import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './card';

interface ResponsiveTableProps {
  className?: string;
  children: React.ReactNode;
}

interface ResponsiveTableHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface ResponsiveTableBodyProps {
  className?: string;
  children: React.ReactNode;
}

interface ResponsiveTableRowProps {
  className?: string;
  children: React.ReactNode;
  mobileCard?: React.ReactNode; // Custom mobile card layout
  onClick?: () => void;
}

interface ResponsiveTableCellProps {
  className?: string;
  children: React.ReactNode;
  label?: string; // Label for mobile view
  hideOnMobile?: boolean;
}

interface ResponsiveTableHeadProps {
  className?: string;
  children: React.ReactNode;
  hideOnMobile?: boolean;
}

// Main responsive table wrapper
export const ResponsiveTable = ({ className, children }: ResponsiveTableProps) => {
  return (
    <div className={cn("relative", className)}>
      {/* Desktop table view */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {children}
          </table>
        </div>
      </div>
      
      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {children}
      </div>
    </div>
  );
};

// Table header - only visible on desktop
export const ResponsiveTableHeader = ({ className, children }: ResponsiveTableHeaderProps) => {
  return (
    <thead className={cn("hidden md:table-header-group bg-gray-50", className)}>
      {children}
    </thead>
  );
};

// Table body
export const ResponsiveTableBody = ({ className, children }: ResponsiveTableBodyProps) => {
  return (
    <>
      {/* Desktop table body */}
      <tbody className={cn("hidden md:table-row-group", className)}>
        {children}
      </tbody>
      
      {/* Mobile card container */}
      <div className="block md:hidden space-y-3">
        {children}
      </div>
    </>
  );
};

// Table row that becomes a card on mobile
export const ResponsiveTableRow = ({ 
  className, 
  children, 
  mobileCard,
  onClick 
}: ResponsiveTableRowProps) => {
  return (
    <>
      {/* Desktop table row */}
      <tr 
        className={cn(
          "hidden md:table-row border-b hover:bg-gray-50 transition-colors",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {children}
      </tr>
      
      {/* Mobile card */}
      <Card 
        className={cn(
          "block md:hidden border shadow-sm hover:shadow-md transition-shadow",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {mobileCard || (
          <CardContent className="p-4">
            <div className="space-y-2">
              {children}
            </div>
          </CardContent>
        )}
      </Card>
    </>
  );
};

// Table cell that adapts to mobile
export const ResponsiveTableCell = ({ 
  className, 
  children, 
  label,
  hideOnMobile = false 
}: ResponsiveTableCellProps) => {
  return (
    <>
      {/* Desktop table cell */}
      <td className={cn("hidden md:table-cell px-4 py-3 text-sm", className)}>
        {children}
      </td>
      
      {/* Mobile field */}
      {!hideOnMobile && (
        <div className="block md:hidden flex justify-between items-center py-1">
          {label && (
            <span className="text-sm font-medium text-gray-600 min-w-[100px]">
              {label}:
            </span>
          )}
          <div className="text-sm text-gray-900 flex-1 text-right">
            {children}
          </div>
        </div>
      )}
    </>
  );
};

// Table header cell
export const ResponsiveTableHead = ({ 
  className, 
  children, 
  hideOnMobile = false 
}: ResponsiveTableHeadProps) => {
  return (
    <th className={cn(
      "hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
      className
    )}>
      {children}
    </th>
  );
};

// Action buttons container that adapts to mobile
export const ResponsiveTableActions = ({ 
  className, 
  children 
}: { 
  className?: string; 
  children: React.ReactNode; 
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2", 
      "md:justify-start justify-end", // Right align on mobile, left on desktop
      "flex-wrap", // Allow wrapping on very small screens
      className
    )}>
      {children}
    </div>
  );
};

// Mobile card content wrapper for custom layouts
export const MobileCardContent = ({ 
  title, 
  subtitle, 
  status, 
  priority, 
  actions, 
  details 
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  priority?: React.ReactNode;
  actions?: React.ReactNode;
  details?: React.ReactNode;
}) => {
  return (
    <CardContent className="p-4">
      {/* Header with title and badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {priority}
          {status}
        </div>
      </div>
      
      {/* Details */}
      {details && (
        <div className="space-y-2 mb-3 text-sm">
          {details}
        </div>
      )}
      
      {/* Actions */}
      {actions && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {actions}
        </div>
      )}
    </CardContent>
  );
}; 