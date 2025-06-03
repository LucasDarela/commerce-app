// components/CustomDateInput.tsx
import * as React from "react"
import { Input } from "@/components/ui/input"

type CustomInputProps = {
  value?: string
  onClick?: () => void
  placeholder?: string
}

const CustomDateInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <Input
      onClick={onClick}
      ref={ref}
      value={value}
      readOnly
      placeholder={placeholder}
      className="w-full pr-10 bg-background text-foreground border border-border rounded-md"
    />
  )
)

CustomDateInput.displayName = "CustomDateInput"
export default CustomDateInput