"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder = "Select or type location...",
}: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  const filteredSuggestions = suggestions.filter((location) =>
    location.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {inputValue || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" align="start" sideOffset={4}>
          <Command className="bg-popover">
            <CommandInput
              placeholder="Search or type new location..."
              value={inputValue}
              onValueChange={handleInputChange}
              className="bg-transparent"
            />
            <CommandList className="bg-popover">
              {filteredSuggestions.length === 0 && inputValue && (
                <CommandEmpty>
                  Press Enter to use &quot;{inputValue}&quot;
                </CommandEmpty>
              )}
              {filteredSuggestions.length > 0 && (
                <CommandGroup>
                  {filteredSuggestions.map((location) => (
                    <CommandItem
                      key={location}
                      value={location}
                      onSelect={() => handleSelect(location)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === location ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {location}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

