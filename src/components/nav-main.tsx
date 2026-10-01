"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ChevronRight, CircleArrowOutUpRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Link } from "react-router";

/**
 * One expandable nav group open at a time.
 *
 * A Collapsible holding its own `defaultOpen` coordinates with nothing: open
 * Timetables and then Academic Structure and both stay expanded, and a sidebar
 * with three groups open is one where the item you want is below the fold.
 * Nothing bounds it, so every group can be open at once.
 *
 * The state is shared ACROSS groups rather than within one, because the rule is
 * about the sidebar and not about a heading: Academics and Finance are rendered
 * by two different NavMain calls, and "one at a time" that let one of each be
 * open would be the same bug with a smaller number.
 *
 * Falls back to per-item state when no provider is present, so NavMain still
 * works anywhere it is dropped in.
 */

interface NavAccordion {
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
}

const NavAccordionContext = createContext<NavAccordion | null>(null);

export function NavAccordionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <NavAccordionContext.Provider value={{ openKey, setOpenKey }}>
      {children}
    </NavAccordionContext.Provider>
  );
}

export function NavMain({
  items,
  groupTitle,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ElementType;
    isActive: boolean;
    childActive: boolean;
    /** Show a trailing arrow: this link opens a separate area and the sidebar
     *  changes under you. Finance and Procurement are their own consoles. */
    affordance?: boolean;
    /**
     * A live count beside the label - work waiting behind this door.
     *
     * Only for a number that means "somebody has to do something": applications
     * waiting, students with no class. A count of how many rows a screen holds
     * is not that, and a badge on every item is a badge on none.
     *
     * Zero must arrive as undefined rather than 0. A grey "0" is a reader
     * stopping to work out that there is nothing to do.
     */
    badge?: number;
    items?: {
      title: string;
      url: string;
      isActive: boolean;
    }[];
  }[];
  groupTitle?: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const accordion = useContext(NavAccordionContext);

  // The group holding the current route opens itself, and keeps doing so as the
  // route moves - navigating from Rooms to Events has to close Timetables and
  // open Calendar, or the sidebar stops describing where you are.
  const routeGroup = items.find((item) => item.childActive)?.title ?? null;
  useEffect(() => {
    if (routeGroup) accordion?.setOpenKey(routeGroup);
    // Only when the route's group changes. Including the setter would reset the
    // reader's own choice on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGroup]);

  return (
    <SidebarGroup className="py-0">
      {groupTitle && (
        <SidebarGroupLabel className="text-xs uppercase mt-2">
          {groupTitle}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="space-y-1">
        {items.map((item, idx) => {
          if ((item?.items?.length ?? 0) < 1) {
            return (
              <SidebarMenuItem key={idx}>
                <Link to={item.url}>
                  <SidebarMenuButton
                    className="h-9 mx-auto"
                    tooltip={item.title}
                    isActive={item.isActive}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.affordance && (
                      <CircleArrowOutUpRight className="ml-auto size-4 text-gray-02" />
                    )}
                    {item.badge != null && item.badge > 0 && (
                      <span
                        // Hidden when the rail is collapsed to icons: a floating
                        // number beside an unlabelled icon says nothing about
                        // what is waiting.
                        className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary group-data-[collapsible=icon]:hidden"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          }
          // Collapsed to icons, the inline accordion is hidden by the rail's
          // own CSS - so pressing a parent did nothing at all and its children
          // could not be reached without expanding the sidebar first. A rail
          // that hides where you can go is worse than no rail. Same answer as
          // console-fe: a menu to the right, opened from the icon.
          if (isCollapsed) {
            return (
              <SidebarMenuItem key={idx}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="mx-auto h-9"
                      tooltip={item.title}
                      isActive={item.isActive || item.childActive}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    className="min-w-48"
                  >
                    {/* The parent names itself, because the icon that opened
                        this is no longer visible once the menu covers it. */}
                    <DropdownMenuLabel className="text-xs font-normal text-gray-01">
                      {item.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.items?.map((subItem) => (
                      <DropdownMenuItem key={subItem.title} asChild>
                        <Link
                          to={subItem.url}
                          className={cn(
                            subItem.isActive && "font-medium text-primary",
                          )}
                        >
                          {subItem.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={idx}
              asChild
              // Controlled where a provider is present, uncontrolled where it
              // is not - `open` and `defaultOpen` are mutually exclusive, so
              // each branch passes exactly one.
              {...(accordion
                ? {
                    open: accordion.openKey === item.title,
                    onOpenChange: (next: boolean) =>
                      accordion.setOpenKey(next ? item.title : null),
                  }
                : { defaultOpen: item.childActive })}
              className="group/collapsible"
            >
              <SidebarMenuItem data-nav-group={item.title}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="mx-auto h-9"
                    tooltip={item.title}
                    isActive={item.isActive}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-6">
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <Link to={subItem.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItem.isActive}
                            className="text-xs"
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
