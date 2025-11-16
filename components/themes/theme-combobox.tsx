"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { getThemeSuggestions } from "@/app/actions/themes";

interface ThemeComboboxProps {
  bookClubId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function ThemeCombobox({
  bookClubId,
  value,
  onChange,
  placeholder = "e.g., Science Fiction, Historical Fiction...",
  disabled = false,
  id = "theme",
}: ThemeComboboxProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    async function loadSuggestions() {
      const themes = await getThemeSuggestions(bookClubId);
      setSuggestions(themes);
      setFilteredSuggestions(themes.slice(0, 10)); // Show top 10 by default
    }
    loadSuggestions();
  }, [bookClubId]);

  function handleInputChange(newValue: string) {
    onChange(newValue);

    if (newValue.trim()) {
      // Filter suggestions based on input
      const filtered = suggestions.filter((theme) =>
        theme.toLowerCase().includes(newValue.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 10));
      setShowSuggestions(true);
    } else {
      // Show top 10 popular unused themes when input is empty
      setFilteredSuggestions(suggestions.slice(0, 10));
      setShowSuggestions(true);
    }
  }

  function handleSuggestionClick(theme: string) {
    onChange(theme);
    setShowSuggestions(false);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Delay hiding to allow click on suggestion
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gold-600/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((theme, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(theme)}
              className="w-full text-left px-4 py-2 hover:bg-cream-100 first:rounded-t-lg last:rounded-b-lg text-sm font-inria text-dark-900"
            >
              {theme}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
