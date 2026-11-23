import { useState, useId, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { CheckIcon, ChevronDownIcon, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectLabel } from './select';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { Sheet, SheetContent, SheetTitle } from './sheet';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mantine/hooks';

export type SelectOption = { value: string; label: string; labelNode?: ReactNode; disabled?: boolean; category?: string };

export interface ModernSelectProps {
  icon?: LucideIcon;
  label?: string;
  sheetTitle?: string;
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
  bottomSheet?: boolean; // override bottomsheet: true = force on, false = force off, undefined = auto (mobile & tablet)
  showCategoryFilter?: boolean; // enable category/brand filter pills under search
  categoryAllLabel?: string; // custom label for 'All' pill (defaults to common.all)
}

export function ModernSelect({
  icon: Icon,
  label,
  sheetTitle,
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
  bottomSheet,
  showCategoryFilter,
  categoryAllLabel,
}: ModernSelectProps) {
  const { t } = useTranslation();
  const id = useId();
  const isSm = inputSize === 'sm';
  const isMobileOrTablet = useMediaQuery('(max-width: 74.99em)');
  const isBottomSheet = bottomSheet ?? isMobileOrTablet;
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recentValues, setRecentValues] = useState<string[]>([]);

  useEffect(() => {
    if (!sheetOpen) {
      setSearchQuery('');
      setSelectedCategory(null);
    }
  }, [sheetOpen]);

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
    setSheetOpen(false);
    setSearchQuery('');
    setSelectedCategory(null);

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

  const categories = useMemo(() => {
    if (!options) return [];
    const counts = new Map<string, number>();
    options.forEach(o => {
      if (
        o.category &&
        o.category !== 'Recently Used' &&
        o.value !== 'no-cars' &&
        o.value !== 'no-categories' &&
        o.value !== 'no-services' &&
        o.value !== 'no-materials' &&
        o.value !== 'no-employees'
      ) {
        counts.set(o.category, (counts.get(o.category) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    // When a category is selected, filter to that category's group
    let groups = groupedOptions;
    if (selectedCategory) {
      groups = groups.filter(group => group.category === selectedCategory);
    }

    if (!q) return groups;

    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          const matchLabel = item.label.toLowerCase().includes(q);
          const matchCat = item.category?.toLowerCase().includes(q);
          return matchLabel || matchCat;
        })
      }))
      .filter(group => group.items.length > 0);
  }, [groupedOptions, searchQuery, selectedCategory]);

  const filteredItemCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [filteredGroups]);

  const btnClasses = cn(
    "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background font-normal text-foreground transition-all duration-200 shadow-2xs outline-none",
    "hover:border-foreground/30",
    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
    !value && "text-muted-foreground/60 font-normal",
    isSm ? "h-9 text-sm px-3" : "h-10 text-sm px-3.5",
    Icon && (isSm ? "pl-9" : "pl-10"), // extra padding for icon
    error && "border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none bg-muted/30",
    triggerClassName
  );

  const renderValue = () => {
    if (valueRender && value) return valueRender(value);
    if (options && value) {
      const selected = options.find(o => o.value === value);
      if (selected) return selected.label;
    }
    return placeholder || t('common.select', "Select...");
  };

  const TopLabel = label ? (
    <label htmlFor={id} className={cn("font-medium text-foreground/85 block select-none", isSm ? "text-xs" : "text-sm")}>
      {label}
    </label>
  ) : null;

  const LeftIcon = Icon ? (
    <div className={cn(
      "absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10",
      isSm ? "left-3" : "left-3.5"
    )}>
      <Icon className={cn(isSm ? "w-4 h-4" : "w-4.5 h-4.5")} />
    </div>
  ) : null;

  if (isBottomSheet && options) {
    const displayTitle = sheetTitle || label || placeholder || t('common.select', 'Select');
    const hasSearch = Boolean(isSearchable || (options && options.length > 5));

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {TopLabel}
        <div className="relative group flex items-center w-full">
          {LeftIcon}
          <button
            id={id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setSearchQuery('');
                setSelectedCategory(null);
                setSheetOpen(true);
              }
            }}
            className={btnClasses}
            role="combobox"
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
          >
            <div className="truncate flex-1 text-left min-w-0">{renderValue()}</div>
            <ChevronDownIcon className={cn("size-4 text-muted-foreground/70 shrink-0 transition-transform duration-200", sheetOpen && "rotate-180")} />
          </button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className={cn(
                "rounded-t-2xl sm:rounded-t-3xl border-t border-border bg-card shadow-2xl p-0 overflow-hidden flex flex-col w-full inset-x-0 max-w-none gap-0 focus:outline-none",
                hasSearch
                  ? "!h-[82dvh] sm:!h-[75dvh] min-h-[55dvh] max-h-[88dvh]"
                  : "max-h-[88dvh]"
              )}
            >
              <SheetTitle className="sr-only">{displayTitle}</SheetTitle>

              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

              {/* Header */}
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm sm:text-base font-bold text-foreground truncate">
                      {displayTitle}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedCategory || searchQuery
                        ? `${filteredItemCount} / ${options.length} ${t('common.items', 'items')}`
                        : `${options.length} ${t('common.items', 'items')}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
                  title={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar if > 5 options or searchable */}
              {hasSearch && (
                <div className="p-3 border-b border-border/40 bg-background/50 backdrop-blur-xs shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('common.searchOptions', `Search ${displayTitle.toLowerCase()}...`)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="search"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-full h-10 pl-9 pr-9 bg-muted/40 border border-input/60 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-foreground placeholder:text-muted-foreground/60"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Category / Brand Filter Pills */}
              {showCategoryFilter && categories.length > 1 && (
                <div className="px-3 sm:px-4 py-2 border-b border-border/40 bg-muted/15 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "h-7.5 px-3 rounded-full text-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer select-none",
                        !selectedCategory
                          ? "bg-amber-500 text-white font-semibold shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/70 font-medium"
                      )}
                    >
                      <span>{categoryAllLabel || t('common.all', 'All')}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono leading-none",
                          !selectedCategory
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {options.length}
                      </span>
                    </button>
                    {categories.map(cat => {
                      const isSelected = selectedCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setSelectedCategory(prev => prev === cat.name ? null : cat.name)}
                          className={cn(
                            "h-7.5 px-3 rounded-full text-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer select-none",
                            isSelected
                              ? "bg-amber-500 text-white font-semibold shadow-xs"
                              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/70 font-medium"
                          )}
                        >
                          <span>{cat.name}</span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono leading-none",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3 space-y-3 pb-8 sm:pb-4">
                {filteredGroups.length === 0 ? (
                  <div className="h-full min-h-[180px] py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Search className="w-8 h-8 opacity-30 text-muted-foreground" />
                    <p className="text-xs font-medium">{t('common.noResultsFound', 'No options found.')}</p>
                    {(selectedCategory || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(null);
                          setSearchQuery('');
                        }}
                        className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline mt-1 cursor-pointer"
                      >
                        {t('common.clearFilters', 'Reset filters')}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div key={group.category || 'all'} className="space-y-1">
                      {group.category && (
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 sticky top-0 bg-card/95 backdrop-blur-xs z-10 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>{group.category}</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        {group.items.map(opt => {
                          const isSelected = value === opt.value.replace('__recent', '');
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={opt.disabled}
                              onClick={() => handleSelect(opt.value)}
                              className={cn(
                                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer min-h-[44px]",
                                isSelected 
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold ring-1 ring-amber-500/30 shadow-2xs" 
                                  : "hover:bg-muted/60 active:bg-muted/80 text-foreground",
                                opt.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                {opt.labelNode ? (
                                  opt.labelNode
                                ) : (
                                  <span className="text-sm sm:text-base truncate block">{opt.label}</span>
                                )}
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <CheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {error && <span className="text-xs text-destructive font-medium ml-1">{error}</span>}
      </div>
    );
  }

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
              <div className="truncate flex-1 text-left min-w-0">{renderValue()}</div>
              <ChevronDownIcon className={cn("size-4 text-muted-foreground/70 shrink-0 transition-transform duration-200", open && "rotate-180")} />
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 shadow-2xl border border-border rounded-xl overflow-hidden bg-popover text-popover-foreground w-[var(--radix-popover-trigger-width,var(--anchor-width,100%))] min-w-[220px]" 
              align="start"
            >
              <Command className="bg-popover text-popover-foreground">
                <CommandInput 
                  placeholder={t('common.searchOptions', `Search ${label?.toLowerCase() || 'options'}...`)} 
                  className={isSm ? "h-9 py-2 text-xs" : "h-10 py-2.5 text-sm"}
                />
                <CommandList className="max-h-60 p-1">
                  <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{t('common.noResultsFound', 'No results found.')}</CommandEmpty>
                  {groupedOptions.map(group => (
                    <CommandGroup key={group.category || 'all'} heading={group.category || undefined} className="text-muted-foreground font-semibold">
                      {group.items.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={`${option.category || ''} ${option.label}`}
                          disabled={option.disabled}
                          onSelect={() => handleSelect(option.value)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg cursor-pointer transition-colors",
                            isSm ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
                            value === option.value.replace('__recent', '') && "bg-primary/10 text-primary font-semibold"
                          )}
                        >
                          <CheckIcon
                            className={cn(
                              "size-3.5 shrink-0 text-primary transition-opacity",
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
        {error && <span className="text-xs text-destructive font-medium ml-1">{error}</span>}
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
            <div className="truncate flex-1 text-left min-w-0">{renderValue()}</div>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border shadow-xl rounded-xl">
            {options ? (
              groupedOptions.map(group => (
                <SelectGroup key={group.category || 'all'}>
                  {group.category && <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">{group.category}</SelectLabel>}
                  {group.items.map(opt => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value} 
                      disabled={opt.disabled}
                      className={cn("rounded-lg cursor-pointer", isSm ? "text-xs py-1.5 px-2" : "text-sm py-2 px-3")}
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
      {error && <span className="text-xs text-destructive font-medium ml-1">{error}</span>}
    </div>
  );
}
