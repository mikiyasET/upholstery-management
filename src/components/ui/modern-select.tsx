import { useState, useId, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectLabel } from './select';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { useTranslation } from 'react-i18next';

export type SelectOption = { value: string; label: string; labelNode?: ReactNode; disabled?: boolean; category?: string };

export interface ModernSelectProps {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  containerClassName?: string;
  triggerClassName?: string;
  placeholder?: string;
  options?: SelectOption[];
  children?: ReactNode; // fallback for non-options usage
  valueRender?: (val: string) => ReactNode;
  value?: string;
  onValueChange?: (val: string) => void;
  searchable?: boolean; // force searchable behavior
  disabled?: boolean;
  cacheKey?: string; // key for local storage caching of recently used items
  maxRecentCount?: number; // default 5
  inputSize?: 'sm' | 'default';
}

export function ModernSelect({
  icon: Icon,
  label,
  error,
  containerClassName,
  triggerClassName,
  placeholder,
  options,
  children,
  valueRender,
  value,
  onValueChange,
  searchable,
  disabled,
  cacheKey,
  maxRecentCount = 5,
  inputSize = 'default',
}: ModernSelectProps) {
  const { t } = useTranslation();
  const id = useId();
  const isSm = inputSize === 'sm';
  const [open, setOpen] = useState(false);
  const [recentValues, setRecentValues] = useState<string[]>([]);

  useEffect(() => {
    if (cacheKey) {
      try {
        const stored = localStorage.getItem(`modern_select_recent_${cacheKey}`);
        if (stored) {
          setRecentValues(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load recent values', e);
      }
    }
  }, [cacheKey]);

  // Prune invalid recent values when options are loaded
  useEffect(() => {
    if (cacheKey && options && options.length > 0) {
      // Don't prune if the options are just the fallback "no-cars" state
      if (options.length === 1 && options[0].value === 'no-cars') return;

      setRecentValues(prev => {
        const validPrev = prev.filter(val => options.some(o => o.value === val));
        if (validPrev.length !== prev.length) {
          try {
            localStorage.setItem(`modern_select_recent_${cacheKey}`, JSON.stringify(validPrev));
          } catch(e) {
            console.error('Failed to save pruned recent values', e);
          }
          return validPrev;
        }
        return prev;
      });
    }
  }, [cacheKey, options]);

  const handleSelect = (val: string | null) => {
    if (val === null) return;
    const realVal = val.replace('__recent', ''); // strip recent suffix if present
    onValueChange?.(realVal);
    setOpen(false);

    if (cacheKey) {
      setRecentValues(prev => {
        const newRecent = [realVal, ...prev.filter(v => v !== realVal)].slice(0, maxRecentCount);
        try {
          localStorage.setItem(`modern_select_recent_${cacheKey}`, JSON.stringify(newRecent));
        } catch (e) {
          console.error('Failed to save recent values', e);
        }
        return newRecent;
      });
    }
  };

  // Automatically make searchable if there are many options
  const isSearchable = searchable ?? (options && options.length > 8);

  const groupedOptions = useMemo(() => {
    if (!options) return [];
    
    let baseGroups = [];
    const hasCategories = options.some(o => o.category);
    if (!hasCategories) {
      // If no categories, return as a single unnamed group, optionally sorted by label
      const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
      baseGroups = [{ category: '', items: sorted }];
    } else {
      const map = new Map<string, SelectOption[]>();
      options.forEach(opt => {
        const cat = opt.category || 'Other';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(opt);
      });

      baseGroups = Array.from(map.entries()).map(([cat, items]) => ({
        category: cat,
        items
      }));
      
      // Sort groups alphabetically by category name
      baseGroups.sort((a, b) => a.category.localeCompare(b.category));
      
      // Sort items alphabetically within each group
      baseGroups.forEach(g => g.items.sort((a, b) => a.label.localeCompare(b.label)));
    }

    if (cacheKey && recentValues.length > 0) {
      const recentItems = recentValues
        .map(val => options.find(o => o.value === val))
        .filter(Boolean) as SelectOption[];
      
      if (recentItems.length > 0) {
        const formattedRecentItems = recentItems.map(item => ({
          ...item,
          value: item.value + '__recent', // Prevents duplicate React keys and values
          label: item.category ? `${item.category} ${item.label}` : item.label,
          category: 'Recently Used'
        }));
        return [{ category: 'Recently Used', items: formattedRecentItems }, ...baseGroups];
      }
    }

    return baseGroups;
  }, [options, recentValues, cacheKey]);

  const btnClasses = cn(
    "flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 font-medium text-gray-900 dark:text-white transition-all duration-200",
    "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-none",
    !value && "text-gray-400 dark:text-gray-500 font-normal",
    isSm ? "h-9 text-xs" : "h-[46px] text-sm",
    Icon && (isSm ? "pl-9" : "pl-11"), // extra padding for icon
    error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
    disabled && "opacity-50 cursor-not-allowed",
    triggerClassName
  );

  const renderValue = () => {
    if (valueRender && value) return valueRender(value);
    if (options && value) {
      const selected = options.find(o => o.value === value);
      if (selected) return selected.label;
    }
    return placeholder || "Select...";
  };

  const TopLabel = label ? (
    <label htmlFor={id} className={cn("font-semibold text-gray-700 dark:text-gray-300", isSm ? "text-xs" : "text-sm")}>
      {label}
    </label>
  ) : null;

  const LeftIcon = Icon ? (
    <div className={cn("absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none z-10", isSm ? "left-2.5" : "left-3.5")}>
      <Icon className={cn(isSm ? "w-4 h-4" : "w-5 h-5")} />
    </div>
  ) : null;

  if (isSearchable && options) {
    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {TopLabel}
        <div className="relative group flex items-center w-full">
          {LeftIcon}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              id={id}
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={btnClasses}
              type="button"
            >
              <span className="truncate">{renderValue()}</span>
              <ChevronDownIcon className="size-4 opacity-50 shrink-0" />
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 shadow-xl border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#111]" 
              style={{ width: 'var(--anchor-width, 100%)' }}
              align="start"
            >
              <Command>
                <CommandInput 
                  placeholder={t('common.searchOptions', `Search ${label?.toLowerCase() || 'options'}...`)} 
                  className={isSm ? "h-8 py-2 text-xs" : ""}
                />
                <CommandList>
                  <CommandEmpty>{t('common.noResultsFound', 'No results found.')}</CommandEmpty>
                  {groupedOptions.map(group => (
                    <CommandGroup key={group.category || 'all'} heading={group.category || undefined}>
                      {group.items.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={`${option.category || ''} ${option.label}`}
                          disabled={option.disabled}
                          onSelect={() => handleSelect(option.value)}
                          className={isSm ? "px-2 py-1.5 text-xs" : ""}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4 shrink-0",
                              value === option.value.replace('__recent', '') ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate flex items-center w-full">
                            {option.labelNode ? option.labelNode : option.label}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
      </div>
    );
  }

  // Fallback to Select
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {TopLabel}
      <div className="relative group flex items-center w-full">
        {LeftIcon}
        <Select value={value} onValueChange={handleSelect} disabled={disabled}>
          <SelectTrigger id={id} className={btnClasses} size={isSm ? "sm" : "default"}>
            <span className="truncate">{renderValue()}</span>
          </SelectTrigger>
          <SelectContent>
            {options ? (
              groupedOptions.map(group => (
                <SelectGroup key={group.category || 'all'}>
                  {group.category && <SelectLabel>{group.category}</SelectLabel>}
                  {group.items.map(opt => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value} 
                      disabled={opt.disabled}
                      className={isSm ? "text-xs py-1.5 px-2" : ""}
                    >
                      {opt.labelNode ? opt.labelNode : opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            ) : children}
          </SelectContent>
        </Select>
      </div>
      {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
    </div>
  );
}
