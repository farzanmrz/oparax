// Imports
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Placeholder section for not-yet-shipped settings areas. Renders a titled Card
 * with a "Coming soon" badge and shows its children as a disabled, non-
 * interactive preview so the eventual layout is visible without being usable.
 * @param props.title - section title
 * @param props.description - section description
 * @param props.children - preview content rendered inert
 * @returns the coming-soon section
 */
export function ComingSoonSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Badge variant="outline">Coming soon</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div
          className="pointer-events-none opacity-50 select-none"
          aria-hidden="true"
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
