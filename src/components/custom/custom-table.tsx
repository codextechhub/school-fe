/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { INFORMATION_CARD_SURFACE } from "@/components/ui/card-surface";
import { EllipsisVertical } from "lucide-react";
import {
  SkeletonCard,
  SkeletonLoadingLabel,
  SkeletonRow,
} from "@/components/custom/skeletons";

/** Ghost rows shown while a list loads - enough to fill the fold, not so many
 *  that the page grows past the real result. */
const GHOST_ROWS = 6;

interface myComponentProps {
  tableHeaderList: string[];
  loading?: boolean;
  tableBodyList?: any;
  hidePagination?: boolean;
  onPageChange?: (param?: string | number) => void;
  currentPage?: number;
  totalPage?: number;
  perPage?: number;
  onRowClick?: (param?: any) => void;
  defaultBodyList?: any;
  actionButton?: string;
  actionButtonOnClick?: (param?: unknown) => void;
  dropDown?: boolean;
  /** The row menu's items: a fixed array, or a function of the row when the
   *  actions differ per row. */
  dropDownList?: any;
  width?: string;
  disabledDropdown?: boolean;
  loadingText?: string;
  emptyText?: string;
  /**
   * How this table behaves below `md`.
   *
   * `cards` (the default) stacks each row into a label/value card, because a
   * table that exists to be READ is unreadable when its right-hand columns sit
   * off-screen behind a sideways scroll. `scroll` keeps the real table for
   * dense grids where the column-to-column comparison IS the content and
   * stacking would destroy it.
   */
  mobile?: "cards" | "scroll";
}

const CustomTable = ({
  tableHeaderList,
  loading,
  actionButtonOnClick,
  actionButton,
  tableBodyList,
  onRowClick,
  defaultBodyList,
  dropDown,
  dropDownList,
  width,
  disabledDropdown,
  totalPage = 0,
  currentPage = 0,
  onPageChange,
  hidePagination,
  loadingText,
  emptyText,
  mobile = "cards",
}: myComponentProps) => {
  //   pagination here ------
  // Function to generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    // Always show first page
    pageNumbers.push(1);

    // Calculate range of pages to show around current page
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPage - 1, currentPage + 1);
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pageNumbers.push("ellipsis-start");
    }
    // Add pages in the calculated range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pageNumbers.push(i);
    }
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPage - 1) {
      pageNumbers.push("ellipsis-end");
    }
    // Always show last page if there is more than one page
    if (totalPage > 1) {
      pageNumbers.push(totalPage);
    }

    return pageNumbers;
  };

  const handlePickObjFromDefaultList = (param: any) => {
    if (defaultBodyList?.length > 0) {
      const obj = defaultBodyList?.find((_: any, idx: any) => idx === param);
      return obj;
    }
  };

  const TableRowComponet = ({
    row,
    children,
    onClick,
  }: {
    row: any;
    children: React.ReactNode;
    onClick: (val: any) => void;
  }) => (
    <TableRow
      className={cn(
        "transition-all duration-300 hover:bg-primary/5",
        // Only a row that actually does something on click says so. Without
        // this the hover tint appears on every table and promises an action
        // that most of them do not have.
        onRowClick && "cursor-pointer",
      )}
      key={row?.id}
    >
      {row?.map((cell: any, index: any) => (
        <TableCell
          className="text-black-01 border-white-02 font-medium font-mont text-sm border-y-5"
          key={index}
          onClick={onClick}
        >
          {cell}
        </TableCell>
      ))}
      {children}
    </TableRow>
  );

  /**
   * The per-row "..." menu.
   *
   * Defined once and used by both renderings. The table had it inline; the
   * phone card needs the same menu, and two copies of a menu is two places for
   * an action to be added to only one of them.
   *
   * `dropDownList` may be a function of the row rather than a fixed array, so a
   * table can offer different actions per row: a cancelled import batch has
   * nothing to roll back, and an array would have to offer the item to every
   * row and refuse it on click.
   */
  const RowActionsMenu = ({ item }: { item: any }) => {
    const actions =
      typeof dropDownList === "function" ? dropDownList(item) : dropDownList;
    return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "cursor-pointer px-2",
          disabledDropdown && "cursor-not-allowed",
        )}
        disabled={disabledDropdown}
      >
        <EllipsisVertical className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="border rounded-sm"
        align="end"
        style={{ width: width ? width : "170px" }}
      >
        {actions?.length > 0 &&
          actions?.map((child: any, idx: any) => (
            <DropdownMenuItem
              key={idx}
              onClick={() => {
                if (child?.onActionClick) {
                  child.onActionClick(item);
                }
              }}
              className={cn(
                "font-light text-sm cursor-pointer text-custom-gray-scale-400",
                child?.className,
              )}
            >
              {child?.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
    );
  };

  // Ghost geometry is derived from the real column definitions, so the loading
  // state previews the exact table that is about to render.
  const ghostColumns = Math.max(1, tableHeaderList?.length ?? 1);

  // Cards own the phone viewport whenever the table would be card-shaped -
  // including while loading, so a phone never flips from table to cards as the
  // data lands. The empty state stays in the table, which reads fine at any
  // width because it is one centred sentence rather than columns.
  const showCards =
    mobile === "cards" && (loading || tableBodyList?.length > 0);

  /** The header labels a card shows, minus the ones a card has no room for. */
  const cardLabels = tableHeaderList?.filter(
    (header) => header.toLowerCase() !== "action",
  );

  return (
    <div className="w-full flex flex-col ">
      {/* Announced once for the surface, outside both the card and the table
          renderings. Putting it inside each would leave two live regions in
          the DOM saying the same thing - CSS hides one per viewport, but that
          is a layout accident to rely on for an accessibility guarantee. */}
      {loading && <SkeletonLoadingLabel text={loadingText || "Loading…"} />}

      {showCards && loading && (
        <div className={cn(INFORMATION_CARD_SURFACE, "overflow-hidden rounded-md md:hidden")}>
          {Array.from({ length: GHOST_ROWS }).map((_, rowIndex) => (
            <SkeletonCard
              key={rowIndex}
              rowIndex={rowIndex}
              lines={Math.max(1, ghostColumns - 2)}
            />
          ))}
        </div>
      )}

      {showCards && !loading && (
        <div className={cn(INFORMATION_CARD_SURFACE, "overflow-hidden rounded-md md:hidden")}>
          {tableBodyList?.map((item: any, rowIndex: any) => {
            // Underscore keys are row metadata (_slug, _key) that the table
            // never renders, and a card must not either.
            const cells = Object.entries(item)
              .filter(([key]) => !key.startsWith("_"))
              .map(([, value]) => value as React.ReactNode);
            // A serial column is noise on a phone: the card IS the row, so
            // "1." above the name says nothing. Promote the next column to be
            // the card's heading instead.
            const serialColumn = cardLabels.findIndex((label) =>
              ["s/n", "sn", "#"].includes(label.trim().toLowerCase()),
            );
            const primaryColumn = serialColumn === 0 && cells.length > 1 ? 1 : 0;
            const rowKey =
              item?._id ?? item?._slug ?? item?._code ?? item?._key ?? rowIndex;

            return (
              <div
                key={rowKey}
                onClick={() => {
                  if (!onRowClick) return;
                  if (defaultBodyList?.length > 0) {
                    onRowClick(handlePickObjFromDefaultList(rowIndex));
                  } else {
                    onRowClick(item);
                  }
                }}
                className={cn(
                  "space-y-2 border-b border-white-02 px-3.5 py-3 last:border-0",
                  onRowClick &&
                    "cursor-pointer transition-colors active:bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 font-mont text-sm font-semibold text-black-01">
                    {cells[primaryColumn]}
                  </div>
                  {dropDown && (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="shrink-0"
                    >
                      <RowActionsMenu item={item} />
                    </div>
                  )}
                </div>
                {cells.map(
                  (cell, index) =>
                    index !== primaryColumn &&
                    index !== serialColumn && (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-3"
                      >
                        <span className="shrink-0 font-mont text-[11px] capitalize text-gray-01">
                          {cardLabels[index]}
                        </span>
                        <span className="min-w-0 text-right font-mont text-sm font-medium text-black-01">
                          {cell}
                        </span>
                      </div>
                    ),
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* table component start here ------ */}
      <Table
        containerClassName={cn(
          INFORMATION_CARD_SURFACE,
          "overflow-hidden rounded-md",
          showCards && "max-md:hidden",
        )}
      >
        {tableHeaderList?.length > 0 && (
          <TableHeader className="border-0">
            <TableRow>
              {tableHeaderList?.map((chi, idx) => {
                return (
                  <TableHead
                    key={idx}
                    className={cn(
                      "text-gray-01 bg-[#F1F1F1] font-semibold font-mont text-xs lg:text-sm whitespace-nowrap capitalize pt-3 pb-2",
                      chi.toLowerCase() === "action" && " text-center",
                    )}
                  >
                    {chi || ""}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
        )}
        {/* body start here ------ */}

        <TableBody className="bg-white">
          {loading ? (
            <>
              {/* The ghost rows are aria-hidden decoration; the announcement
                  for them lives once at the top of the component. */}
              {Array.from({ length: GHOST_ROWS }).map((_, rowIndex) => (
                <SkeletonRow
                  key={rowIndex}
                  rowIndex={rowIndex}
                  columns={ghostColumns}
                />
              ))}
            </>
          ) : (
            <>
              {tableBodyList?.length > 0 ? (
                <>
                  {tableBodyList?.map((item: any, rowIndex: any) => {
                    // Underscore keys are row metadata the table never renders
                    // - an id the row menu needs to find its record back, and
                    // nothing a reader should see.
                    //
                    // This used to filter the single literal key "_slug" while
                    // the card renderer above already filtered every "_" key.
                    // The two disagreed, so a row carrying "_id" was hidden on
                    // a phone and rendered as a first column on a desktop,
                    // shifting every value one cell left: the admission number
                    // sat under Student, the class under Admission no., and the
                    // table read as though the data were wrong rather than the
                    // layout. Same rule in both places now.
                    const FORMATTED_DATA = Object?.entries(item)
                      .filter(([key]) => !key.startsWith("_"))
                      ?.map((d) => {
                        return {
                          [d[0]]: d[1],
                        };
                      });
                    return (
                      <TableRowComponet
                        key={rowIndex}
                        row={FORMATTED_DATA?.map(
                          (data) => Object.values(data)[0],
                        )}
                        onClick={() => {
                          if (onRowClick) {
                            if (defaultBodyList?.length > 0) {
                              onRowClick(
                                handlePickObjFromDefaultList(rowIndex),
                              );
                            } else {
                              onRowClick(item);
                            }
                          }
                        }}
                      >
                        {dropDown && (
                          <TableCell className="text-black-01 border-white-02 font-medium font-mont text-sm border-y-5">
                            <div
                              style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100%",
                              }}
                              className=""
                            >
                              {actionButton ? (
                                <button
                                  type="button"
                                  disabled={disabledDropdown}
                                  onClick={() => {
                                    if (actionButtonOnClick) {
                                      actionButtonOnClick(item);
                                    }
                                  }}
                                  className="w-13 h-6 rounded-xm border-[0.5px] border-black-02 text-black-02 font-medium text-xs cursor-pointer"
                                >
                                  {actionButton}
                                </button>
                              ) : (
                                <RowActionsMenu item={item} />
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRowComponet>
                    );
                  })}
                </>
              ) : (
                <>
                  <TableRow>
                    <TableCell
                      colSpan={tableHeaderList?.length + 1}
                      className="h-56 text-center hover:bg-transparent"
                    >
                      <div className="size-40 mx-auto rounded-full border border-primary grid place-content-center">
                        <p className="text-xs text-gray-01">
                          {emptyText ? emptyText : "No available data."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              )}
            </>
          )}
        </TableBody>
        {/* body end here ------------------ */}
      </Table>
      {/* table component end here ------ */}
      {/* pagination start here ------ */}
      {totalPage >= 2 && !hidePagination && (
        <div className="inline-flex items-center gap-2 ml-auto mt-3.5">
          {getPageNumbers().map((page, index) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <div key={`ellipsis-${index}`} className="px-2 text-black-02">
                  ...
                </div>
              );
            }

            const isActive = currentPage === page;

            return (
              <button
                key={`page-${page}`}
                onClick={() => {
                  {
                    if (onPageChange) onPageChange(page as number);
                  }
                }}
                className={cn(
                  "grid size-7.5 place-content-center rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "bg-transparent text-black-02 hover:bg-gray-100",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomTable;
