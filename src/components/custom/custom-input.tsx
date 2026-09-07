"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon, Loader, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
  isRequired?: boolean;
  loading?: boolean;
  canSearch?: boolean;
  onSearch?: () => void;
  containerClass?: string;
}

export const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  (
    {
      label,
      id,
      type,
      error,
      className,
      isRequired,
      loading,
      canSearch,
      onSearch,
      containerClass,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === "password";
    // A date field gets this app's own calendar, not the browser's. The native
    // control looks different in every browser and matches nothing else on the
    // screen, so a form built from CustomInput was consistent everywhere except
    // its dates.
    const isDateType = type === "date";

    return (
      <div
        className={cn("grid w-full items-center gap-1.5 h-fit", containerClass)}
      >
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "text-sm text-black-01",
              isRequired && "after:text-error after:content-['*'] after:pl-1.5",
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {isDateType ? (
            <DatePickerInput
              id={id}
              className={className}
              ref={ref}
              {...props}
              aria-invalid={error ? true : false}
            />
          ) : (
          <Input
            id={id}
            type={isPasswordType && showPassword ? "text" : type}
            className={cn(className, { "pr-10": isPasswordType })}
            ref={ref}
            {...props}
            aria-invalid={error ? true : false}
          />
          )}
          {isPasswordType && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {!showPassword ? (
                <EyeOffIcon className="size-5 text-[#2121214D]" />
              ) : (
                <EyeIcon className="size-5 text-[#2121214D]" />
              )}
            </Button>
          )}
          {loading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute z-1 right-1 top-0 h-full px-3 py-2 hover:bg-transparent"
            >
              <Loader className="text-primary animate-spin size-4.5 bg-white" />
            </Button>
          )}
          {canSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute z-1 right-1 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={onSearch}
            >
              <Search className="text-border-01 placeholder:text-gray-01 size-4.5 bg-white" />
            </Button>
          )}
        </div>
        {error && (
          <p className="text-xs font-medium text-error-text">{error}</p>
        )}
      </div>
    );
  },
);
CustomInput.displayName = "CustomInput";
