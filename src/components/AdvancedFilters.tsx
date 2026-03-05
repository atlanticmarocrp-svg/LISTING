import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Filter, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface FilterOptions {
  regions: string[];
  languages: string[];
  gameplayTypes: string[];
  tags: string[];
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  activeCount: number;
  // optional controlled open state
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // when true the internal toggle button is hidden (useful when external button is provided)
  hideToggle?: boolean;
  // available regions from actual servers
  availableRegions?: string[];
}

// build a list of all country codes supported by Intl
const COUNTRIES = (() => {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    // supportedValuesOf('region') isn't in TS lib so cast to any
    const regions: string[] = (Intl as any).supportedValuesOf('region');
    return regions
      .filter(c => c.length === 2) // iso-3166 alpha-2 only
      .map(c => ({ code: c, name: names.of(c) || c }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // fallback minimal list if Intl API not available
    return [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'GB', name: 'United Kingdom' }
    ];
  }
})();
const LANGUAGES = ["EN", "FR", "DE", "ES", "PT", "RU", "ZH", "JA"];
const GAMEPLAY_TYPES = ["RP", "PvP", "PvE", "Racing", "Roleplay", "Survival", "Creative", "Freeroam"];

export default function AdvancedFilters({ filters, onFiltersChange, activeCount, isOpen: isOpenProp, onOpenChange, hideToggle, availableRegions }: AdvancedFiltersProps) {
  // support both internal and controlled open state
  const isControlled = typeof isOpenProp !== 'undefined' && typeof onOpenChange === 'function';
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = isControlled ? isOpenProp! : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [customTag, setCustomTag] = React.useState("");

  // Build regions list from availableRegions or fallback to COUNTRIES
  const regionsToDisplay = React.useMemo(() => {
    if (availableRegions && availableRegions.length > 0) {
      // Build Intl display names for available regions
      const names = new Intl.DisplayNames(['en'], { type: 'region' });
      return availableRegions
        .map(code => ({ code, name: names.of(code) || code }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // Fallback to all countries
    return COUNTRIES;
  }, [availableRegions]);

  const handleRegionToggle = (region: string) => {
    onFiltersChange({
      ...filters,
      regions: filters.regions.includes(region)
        ? filters.regions.filter(r => r !== region)
        : [...filters.regions, region]
    });
  };

  const handleLanguageToggle = (language: string) => {
    onFiltersChange({
      ...filters,
      languages: filters.languages.includes(language)
        ? filters.languages.filter(l => l !== language)
        : [...filters.languages, language]
    });
  };

  const handleGameplayToggle = (type: string) => {
    onFiltersChange({
      ...filters,
      gameplayTypes: filters.gameplayTypes.includes(type)
        ? filters.gameplayTypes.filter(t => t !== type)
        : [...filters.gameplayTypes, type]
    });
  };

  const handleAddTag = () => {
    if (customTag.trim() && !filters.tags.includes(customTag.trim())) {
      onFiltersChange({
        ...filters,
        tags: [...filters.tags, customTag.trim()]
      });
      setCustomTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags.filter(t => t !== tag)
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      regions: [],
      languages: [],
      gameplayTypes: [],
      tags: []
    });
  };

  return (
    <div className="relative">
      {/* Filter Button (optional) */}
      {!hideToggle && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all border",
            isOpen
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-indigo-500"
          )}
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
              {activeCount}
            </span>
          )}
        </button>
      )}

      {/* Filter Panel - Floating */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 overflow-y-auto max-h-96 z-50 shadow-2xl"
          >
            {/* Country filter */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Country</h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {regionsToDisplay.map(({ code, name }) => (
                  <button
                    key={code}
                    onClick={() => handleRegionToggle(code)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border",
                      filters.regions.includes(code)
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageToggle(lang)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border",
                      filters.languages.includes(lang)
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Gameplay Types */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Gameplay Type</h3>
              <div className="flex flex-wrap gap-2">
                {GAMEPLAY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGameplayToggle(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border",
                      filters.gameplayTypes.includes(type)
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tags */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Custom Tags</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add custom tag..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              {filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 border border-blue-500 text-white text-xs font-bold rounded-lg"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-200 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Button */}
            {activeCount > 0 && (
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
