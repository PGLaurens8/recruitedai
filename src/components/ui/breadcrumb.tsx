import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Compact wayfinding trail rendered below a page title.
 * All items except the last are clickable links (muted); the last is the
 * current page (normal weight). On screens under 640px only the immediate
 * parent and current page are shown.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          // On mobile show only the immediate parent and the current page.
          const hideOnMobile = index < items.length - 2;

          return (
            <li
              key={`${item.label}-${index}`}
              className={cn("flex items-center gap-1.5", hideOnMobile && "hidden sm:flex")}
            >
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(isLast ? "font-normal text-foreground" : "")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
