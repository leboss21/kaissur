import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean; // Permet de saisir une valeur libre non présente dans la liste
  error?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  disabled = false,
  className = '',
  allowCustom = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trouver l'option sélectionnée ou afficher la valeur libre
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (allowCustom && value ? value : '');

  // Filtrer les options selon la recherche
  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  });

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus sur l'input de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomSubmit = () => {
    if (allowCustom && searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Bouton Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`glass-input w-full flex items-center justify-between gap-2 text-left py-2.5 px-3.5 transition-all select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        } ${error ? 'border-rose-500/80 ring-1 ring-rose-500/50' : ''}`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-primary">{selectedOption.icon}</span>
          )}
          {displayLabel ? (
            <span className="text-white font-medium truncate text-sm">{displayLabel}</span>
          ) : (
            <span className="text-textMuted text-sm">{placeholder}</span>
          )}
          {selectedOption?.badge && (
            <span className="ml-auto mr-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textMuted flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Menu Déroulant */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 glass-panel bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Champ de recherche */}
          <div className="p-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
            <Search className="w-4 h-4 text-textMuted flex-shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm text-white placeholder-textMuted outline-none py-1 px-1 font-sans"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  } else if (allowCustom && searchTerm.trim()) {
                    handleCustomSubmit();
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-textMuted hover:text-white p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Liste des options */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-textMuted">
                {allowCustom && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="w-full text-primary hover:underline font-semibold py-1.5 px-2 bg-primary/10 rounded-lg"
                  >
                    Utiliser « {searchTerm.trim()} »
                  </button>
                ) : (
                  'Aucun résultat trouvé'
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      isSelected
                        ? 'bg-primary text-white font-semibold shadow-sm'
                        : 'text-textMuted hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1">
                      {opt.icon && (
                        <span className={`flex-shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`}>
                          {opt.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="truncate">{opt.label}</div>
                        {opt.subLabel && (
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-white/80' : 'text-textMuted'
                            }`}
                          >
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                    {opt.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-primary/20 text-primary border-primary/30'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
