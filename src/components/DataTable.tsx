import React from 'react';
import { cn, formatAppDate } from '../lib/utils';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from 'react-i18next';

interface TableContextType {
  page?: number;
  limit?: number;
}

const TableContext = React.createContext<TableContextType>({});

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  page?: number;
  limit?: number;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, page, limit, ...props }, ref) => (
    <TableContext.Provider value={{ page, limit }}>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table
          ref={ref}
          className={cn(
            "w-full border-collapse text-left text-sm text-foreground align-middle",
            className
          )}
          {...props}
        />
      </div>
    </TableContext.Provider>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    return (
      <thead
        ref={ref}
        className={cn(
          "bg-muted/40 dark:bg-[#141417] border-b border-border sticky top-0 backdrop-blur-md z-10",
          className
        )}
        {...props}
      >
        {childrenArray.map((child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { isHeaderRow: true } as any);
          }
          return child;
        })}
      </thead>
    );
  }
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const { page, limit } = React.useContext(TableContext);
    let rowIndexCounter = (page !== undefined && limit !== undefined) ? (page - 1) * limit : 0;
    return (
      <tbody
        ref={ref}
        className={cn("divide-y divide-border/40", className)}
        {...props}
      >
        {childrenArray.map((child) => {
          if (React.isValidElement(child)) {
            const element = child as React.ReactElement<any>;
            // Check if this row has a colSpan child (like loading/empty state rows)
            const hasColSpan = React.Children.toArray(element.props.children).some(
              (c) => React.isValidElement(c) && (c as React.ReactElement<any>).props.colSpan !== undefined
            );
            if (hasColSpan) {
              return React.cloneElement(element, { isSpecialRow: true });
            }
            const currentIdx = element.props.rowIndex !== undefined ? element.props.rowIndex : rowIndexCounter;
            if (element.props.rowIndex === undefined) {
              rowIndexCounter++;
            } else {
              rowIndexCounter = element.props.rowIndex + 1;
            }
            return React.cloneElement(element, { rowIndex: currentIdx });
          }
          return child;
        })}
      </tbody>
    );
  }
);
TableBody.displayName = 'TableBody';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-muted-foreground uppercase tracking-wider text-xs select-none",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-4 align-middle text-foreground", className)}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  rowIndex?: number;
  isHeaderRow?: boolean;
  isSpecialRow?: boolean;
  hasPendingPulse?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, rowIndex, isHeaderRow, isSpecialRow, hasPendingPulse, ...props }, ref) => {
    const { t } = useTranslation();

    if (isSpecialRow) {
      const adjustedChildren = React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.props as any).colSpan !== undefined) {
          return React.cloneElement(child, {
            colSpan: (child.props as any).colSpan + 1,
          } as any);
        }
        return child;
      });
      return (
        <tr
          ref={ref}
          className={cn(
            "border-b border-gray-100/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1f1f1f]/30 transition-colors duration-150",
            className
          )}
          {...props}
        >
          {adjustedChildren}
        </tr>
      );
    }

    if (isHeaderRow) {
      return (
        <tr
          ref={ref}
          className={cn(
            "border-b border-gray-100/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1f1f1f]/30 transition-colors duration-150",
            className
          )}
          {...props}
        >
          <TableHead className="w-12 text-center text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider text-xs select-none">
            {t('common.rowNumber', 'No.')}
          </TableHead>
          {children}
        </tr>
      );
    }

    if (rowIndex !== undefined) {
      return (
        <tr
          ref={ref}
          className={cn(
            "border-b border-gray-100/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1f1f1f]/30 transition-colors duration-150",
            className
          )}
          {...props}
        >
          <TableCell className="w-12 text-center text-gray-500 dark:text-gray-400 font-medium select-none relative">
            {hasPendingPulse && (
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-full animate-pulse" />
            )}
            <span className={hasPendingPulse ? 'pl-2.5 block' : ''}>
              {rowIndex + 1}
            </span>
          </TableCell>
          {children}
        </tr>
      );
    }

    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-gray-100/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#1f1f1f]/30 transition-colors duration-150",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = 'TableRow';

export const TableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card rounded-2xl shadow-sm border border-border overflow-hidden relative",
        className
      )}
      {...props}
    />
  )
);
TableContainer.displayName = 'TableContainer';

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TableSearch: React.FC<TableSearchProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in any editable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true'
        )
      ) {
        return;
      }

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn("group relative w-full sm:w-[480px] md:w-[540px] max-w-full shrink-0 no-print transition-all duration-300", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-amber-500 transition-colors duration-200" size={18} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="w-full pl-10.5 pr-10 py-2.5 bg-background border border-border rounded-lg outline-none hover:border-border/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 shadow-sm text-sm h-[42px] font-medium text-foreground placeholder:text-muted-foreground"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-all cursor-pointer"
        >
          <X size={14} />
        </button>
      ) : (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none select-none group-focus-within:hidden transition-all duration-200">
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-md">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>
      )}
    </div>
  );
};

export interface TablePageAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
  title?: string;
  disabled?: boolean;
}export interface FilterPillsOption {
  label: React.ReactNode;
  value: string;
}

export interface FilterPillsConfig {
  options: FilterPillsOption[];
  activeValue: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  size?: 'sm' | 'md';
}

export interface SelectFilterConfig {
  value: string;
  onChange: (value: string) => void;
  options: { label: React.ReactNode; value: string }[];
  placeholder?: string;
}

export interface DateFilterConfig {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  isClearable?: boolean;
}

export interface TablePageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: TablePageAction[];
  searchVal?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  // Declarative filter props
  filterPills?: FilterPillsConfig[];
  selectFilters?: SelectFilterConfig[];
  dateFilter?: DateFilterConfig;
  monthFilter?: {
    value: string;
    onChange: (value: string) => void;
  };
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  onResetFilters?: () => void;
  showResetFilters?: boolean;
  customTags?: { id: string; label: React.ReactNode; onClear: () => void }[];

  // Legacy filter support
  filters?: React.ReactNode;
  className?: string;
}

export const TablePageHeader: React.FC<TablePageHeaderProps> = ({
  title,
  description,
  actions,
  searchVal,
  onSearchChange,
  searchPlaceholder,
  filterPills,
  selectFilters,
  dateFilter,
  monthFilter,
  onClearFilters,
  showClearFilters,
  onResetFilters,
  showResetFilters,
  customTags,
  filters,
  className
}) => {
  const { t } = useTranslation();
  const hasFilters =
    filters ||
    (filterPills && filterPills.length > 0) ||
    (selectFilters && selectFilters.length > 0) ||
    dateFilter ||
    monthFilter ||
    (customTags && customTags.length > 0) ||
    showClearFilters ||
    showResetFilters;

  // Active tags logic
  const activeTags: { id: string; label: React.ReactNode; onClear: () => void }[] = [];

  if (filterPills) {
    filterPills.forEach((pill, pillIdx) => {
      const defaultOpt = pill.options.find(opt => opt.value.toLowerCase() === 'all') || pill.options[0];
      if (pill.activeValue !== defaultOpt?.value) {
        const activeOpt = pill.options.find(opt => opt.value === pill.activeValue);
        if (activeOpt) {
          const groupLabel = pill.label;
          const tagLabel = groupLabel ? <>{groupLabel}: {activeOpt.label}</> : activeOpt.label;
          activeTags.push({
            id: `pill-${pillIdx}`,
            label: tagLabel,
            onClear: () => pill.onChange(defaultOpt.value)
          });
        }
      }
    });
  }

  if (selectFilters) {
    selectFilters.forEach((sel, selIdx) => {
      if (sel.value && sel.value !== '') {
        const activeOpt = sel.options.find(opt => opt.value === sel.value);
        if (activeOpt) {
          const groupLabel = sel.placeholder || 'Filter';
          const tagLabel = <>{groupLabel}: {activeOpt.label}</>;
          activeTags.push({
            id: `select-${selIdx}`,
            label: tagLabel,
            onClear: () => sel.onChange('')
          });
        }
      }
    });
  }

  if (dateFilter && dateFilter.selected) {
    const formattedDate = formatAppDate(dateFilter.selected);
    const groupLabel = dateFilter.placeholderText || t('common.date', 'Date');
    activeTags.push({
      id: 'date-filter',
      label: <>{groupLabel}: {formattedDate}</>,
      onClear: () => dateFilter.onChange(null)
    });
  }

  if (monthFilter && monthFilter.value) {
    activeTags.push({
      id: 'month-filter',
      label: <>{t('common.month', 'Month')}: {monthFilter.value}</>,
      onClear: () => monthFilter.onChange('')
    });
  }

  if (customTags) {
    activeTags.push(...customTags);
  }

  return (
    <div className={cn("space-y-6 mb-6", className)}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{description}</p>
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const btnClass =
                action.variant === 'danger' ? 'header-btn-danger' :
                  action.variant === 'secondary' ? 'header-btn-secondary' :
                    'header-btn-primary';
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(btnClass, "no-print w-full sm:w-auto")}
                  title={action.title}
                  disabled={action.disabled}
                >
                  {Icon && <Icon size={18} />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(hasFilters || (onSearchChange !== undefined && searchVal !== undefined)) && (
        <div className="space-y-3.5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {hasFilters ? (
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3.5 sm:items-center w-full md:w-auto">
                {filterPills && filterPills.map((pill, idx) => (
                  <FilterPills
                    key={`pill-${idx}`}
                    activeValue={pill.activeValue}
                    onChange={pill.onChange}
                    options={pill.options}
                    label={pill.label}
                    size={pill.size}
                  />
                ))}

                {selectFilters && selectFilters.map((sel, idx) => (
                  <TableSelectDropdown
                    key={`select-${idx}`}
                    value={sel.value}
                    onChange={sel.onChange}
                    options={sel.options}
                    placeholder={sel.placeholder}
                  />
                ))}

                {monthFilter && (
                  <input
                    type="month"
                    value={monthFilter.value}
                    onChange={(e) => monthFilter.onChange(e.target.value)}
                    className="header-input no-print w-full sm:w-auto"
                  />
                )}

                {dateFilter && (
                  <div className="min-w-[200px] w-full sm:w-auto">
                    <DatePicker
                      selected={dateFilter.selected}
                      onChange={dateFilter.onChange}
                      className="header-input w-full"
                      wrapperClassName="w-full"
                      dateFormat="dd-MM-yyyy"
                      placeholderText={dateFilter.placeholderText || t('common.filterByDate', 'Filter By Date')}
                      isClearable={dateFilter.isClearable}
                    />
                  </div>
                )}

                {filters}
              </div>
            ) : (
              <div />
            )}
            {onSearchChange !== undefined && searchVal !== undefined && (
              <TableSearch
                value={searchVal}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            )}
          </div>

          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center animate-in fade-in duration-200">
              {activeTags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 dark:bg-gold/15 border border-gold/20 dark:border-gold/30 rounded-xl text-xs font-semibold text-gold-dark dark:text-gold transition-all hover:border-gold/40 shadow-sm"
                >
                  <span className="select-none">{tag.label}</span>
                  <button
                    type="button"
                    onClick={tag.onClear}
                    className="hover:bg-gold/20 dark:hover:bg-gold/30 p-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={12} className="stroke-[2.5]" />
                  </button>
                </div>
              ))}
              {showClearFilters && onClearFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg ml-1"
                >
                  {t('common.clearAll', 'Clear All')}
                </button>
              )}
              {showResetFilters && onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs font-semibold text-gold-dark dark:text-gold hover:text-gold transition-colors cursor-pointer px-2 py-1 hover:bg-gold/5 dark:hover:bg-gold/10 rounded-lg ml-1.5"
                >
                  {t('common.resetToToday', 'Reset to Today')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface FilterPillsProps {
  options: FilterPillsOption[];
  activeValue: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  options,
  activeValue,
  onChange,
  label,
  size: _size = 'md',
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find((opt) => opt.value === activeValue) || options[0];
  const defaultOpt = options.find(opt => opt.value.toLowerCase() === 'all') || options[0];
  const isFilterActive = activeValue !== defaultOpt?.value;

  const displayLabel = label
    ? (
      <>
        <span className="text-gray-400 dark:text-zinc-500 font-medium mr-1.5">{label}:</span>
        <span className={cn("font-semibold", "text-gray-800 dark:text-gray-200")}>
          {activeOption?.label}
        </span>
      </>
    )
    : (
      <span className={cn(isFilterActive ? " font-semibold" : "text-gray-700 dark:text-gray-300 font-medium")}>
        {activeOption?.label}
      </span>
    );

  const triggerHeightClass = 'h-[42px] rounded-lg text-sm';

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-4 font-medium transition-all duration-200 ease-out cursor-pointer select-none whitespace-nowrap flex items-center justify-between gap-2 border outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 shadow-sm active:scale-[0.98]",
          triggerHeightClass,
          "bg-card hover:bg-muted/50",
          isFilterActive
            ? "border-amber-500/40 text-amber-500 hover:border-amber-500/60"
            : "border-border text-foreground hover:border-border/80",
          isOpen && "border-amber-500 focus:ring-amber-500/20"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={16}
          className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-amber-500")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 min-w-[190px] w-max max-w-[280px] bg-card border border-border rounded-xl shadow-xl p-1.5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isActive = opt.value === activeValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 font-medium transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 text-sm rounded-lg",
                    isActive
                      ? "bg-gold/8 text-gold-dark dark:text-gold font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#282828] hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && (
                    <Check size={15} className="text-gold dark:text-gold shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface TableSelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: React.ReactNode; value: string }[];
  placeholder?: string;
  className?: string;
}

export const TableSelectDropdown: React.FC<TableSelectDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find((opt) => opt.value === value);
  const isFilterActive = value !== '';

  const getCleanLabel = (str: string) => {
    const s = str.replace(/^All\s+/i, '');
    if (s.toLowerCase() === 'statuses') return 'Status';
    return s;
  };

  const displayLabel = isFilterActive
    ? (
      <>
        {placeholder && <span className="text-gray-400 dark:text-zinc-500 font-medium mr-1.5">{getCleanLabel(placeholder)}:</span>}
        <span className="font-semibold text-gold-dark dark:text-gold">
          {activeOption?.label}
        </span>
      </>
    )
    : (
      <span className="text-gray-700 dark:text-gray-300 font-medium">
        {placeholder || "Select..."}
      </span>
    );

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left w-full sm:w-auto min-w-[160px]", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 h-[42px] rounded-lg text-sm font-medium transition-all duration-200 ease-out cursor-pointer select-none whitespace-nowrap flex items-center justify-between gap-2 border shadow-sm active:scale-[0.98] outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500",
          "bg-card hover:bg-muted/50",
          isFilterActive
            ? "border-amber-500/40 text-amber-500 hover:border-amber-500/60"
            : "border-border text-foreground hover:border-border/80",
          isOpen && "border-amber-500 text-amber-500 focus:ring-amber-500/20"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={16}
          className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-amber-500")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 min-w-[190px] w-full bg-card border border-border rounded-xl shadow-xl p-1.5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {placeholder && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 font-medium transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 text-sm rounded-lg",
                  !isFilterActive
                    ? "bg-gold/8 text-gold-dark dark:text-gold font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#282828] hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <span className="truncate">{placeholder}</span>
                {!isFilterActive && (
                  <Check size={15} className="text-gold dark:text-gold shrink-0 stroke-[2.5]" />
                )}
              </button>
            )}
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 font-medium transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 text-sm rounded-lg",
                    isActive
                      ? "bg-gold/8 text-gold-dark dark:text-gold font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#282828] hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && (
                    <Check size={15} className="text-gold dark:text-gold shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};



