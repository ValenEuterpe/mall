"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type Table as TableType,
  type Column,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  isLoading?: boolean;

  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  /** If provided, use this column filter instead of global filter */
  searchColumn?: string;

  enablePagination?: boolean;
  pageSizeOptions?: number[];
  /** Used for client-side default and as server-side page size */
  pageSize?: number;

  /** Server-side pagination support */
  totalRows?: number;
  currentPage?: number; // 1-based
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  onRowClick?: (row: TData) => void;
  onSelectionChange?: (rows: TData[]) => void;

  emptyMessage?: string;
  emptyState?: React.ReactNode;

  toolbarActions?: React.ReactNode;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;

  enableExport?: boolean;
  onExport?: (data: TData[]) => void;

  onRefresh?: () => void;

  rowClassName?: (row: TData) => string;
  stickyHeader?: boolean;
  maxHeight?: string;

  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

export function getSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        aria-label="Select row"
        className="translate-y-[2px]"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };
}

function DataTableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DataTableToolbar<TData>({
  table,
  enableSearch,
  searchPlaceholder,
  searchColumn,
  enableColumnVisibility,
  enableExport,
  onExport,
  onRefresh,
  toolbarActions,
  selectedCount,
  bulkActions,
}: {
  table: TableType<TData>;
  enableSearch: boolean;
  searchPlaceholder: string;
  searchColumn?: string;
  enableColumnVisibility: boolean;
  enableExport: boolean;
  onExport?: (data: TData[]) => void;
  onRefresh?: () => void;
  toolbarActions?: React.ReactNode;
  selectedCount: number;
  bulkActions?: React.ReactNode;
}) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const filterValue = searchColumn
    ? ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? "")
    : (table.getState().globalFilter ?? "");

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex flex-1 items-center gap-2">
        {enableSearch && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={filterValue}
              onChange={(event) => {
                if (searchColumn) {
                  table.getColumn(searchColumn)?.setFilterValue(event.target.value);
                } else {
                  table.setGlobalFilter(event.target.value);
                }
              }}
              className="h-9 w-64 pl-8"
            />
            {filterValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 px-2"
                onClick={() => {
                  if (searchColumn) {
                    table.getColumn(searchColumn)?.setFilterValue("");
                  } else {
                    table.setGlobalFilter("");
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        {selectedCount > 0 && bulkActions && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedCount} selected</Badge>
            {bulkActions}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {toolbarActions}

        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}

        {enableExport && onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(table.getFilteredRowModel().rows.map((r) => r.original))}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}

        {enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                  >
                    {column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
  totalRows,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: {
  table: TableType<TData>;
  pageSizeOptions: number[];
  totalRows?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const isServerSide = Boolean(onPageChange);

  const pageSize = table.getState().pagination.pageSize;
  const pageCount = isServerSide ? Math.ceil((totalRows ?? 0) / pageSize) : table.getPageCount();
  const pageIndex = isServerSide ? Math.max(0, (currentPage ?? 1) - 1) : table.getState().pagination.pageIndex;

  const handlePageChange = (nextPageIndex: number) => {
    if (isServerSide) {
      onPageChange?.(nextPageIndex + 1);
      return;
    }
    table.setPageIndex(nextPageIndex);
  };

  const handlePageSizeChange = (size: number) => {
    if (isServerSide) {
      onPageSizeChange?.(size);
      return;
    }
    table.setPageSize(size);
  };

  return (
    <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
          <>
            {table.getFilteredSelectedRowModel().rows.length} of {totalRows ?? table.getFilteredRowModel().rows.length} row(s) selected
          </>
        ) : (
          <>
            {isServerSide
              ? `${pageIndex * pageSize + 1}-${Math.min((pageIndex + 1) * pageSize, totalRows ?? 0)} of ${totalRows ?? 0} rows`
              : `${table.getFilteredRowModel().rows.length} row(s)`}
          </>
        )}
      </div>

      <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
          <Select value={`${pageSize}`} onValueChange={(value) => handlePageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={`${s}`}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount || 1}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={pageIndex === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableSearch = true,
  searchPlaceholder = "Search...",
  searchColumn,
  enablePagination = true,
  pageSizeOptions = [10, 20, 30, 50, 100],
  pageSize = 10,
  totalRows,
  currentPage,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  emptyMessage = "No results found.",
  emptyState,
  toolbarActions,
  bulkActions,
  enableExport = false,
  onExport,
  onRefresh,
  rowClassName,
  stickyHeader = false,
  maxHeight,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const tableColumns = React.useMemo(() => {
    return enableRowSelection ? [getSelectionColumn<TData>(), ...columns] : columns;
  }, [columns, enableRowSelection]);

  const isServerSidePagination = Boolean(onPageChange);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination && !isServerSidePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: {
        pageIndex: isServerSidePagination ? Math.max(0, (currentPage ?? 1) - 1) : 0,
        pageSize,
      },
    },
    manualPagination: isServerSidePagination,
    pageCount: isServerSidePagination && totalRows != null ? Math.ceil(totalRows / pageSize) : undefined,
  });

  const selectedRows = React.useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    // TanStack table selection model depends on rowSelection state.
    [rowSelection]
  );

  React.useEffect(() => {
    onSelectionChange?.(selectedRows);
  }, [onSelectionChange, selectedRows]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <DataTableToolbar
          table={table}
          enableSearch={enableSearch}
          searchPlaceholder={searchPlaceholder}
          searchColumn={searchColumn}
          enableColumnVisibility={enableColumnVisibility}
          enableExport={enableExport}
          onRefresh={onRefresh}
          toolbarActions={toolbarActions}
          selectedCount={0}
        />
        <DataTableSkeleton columns={tableColumns.length} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <DataTableToolbar
        table={table}
        enableSearch={enableSearch}
        searchPlaceholder={searchPlaceholder}
        searchColumn={searchColumn}
        enableColumnVisibility={enableColumnVisibility}
        enableExport={enableExport}
        onExport={onExport}
        onRefresh={onRefresh}
        toolbarActions={toolbarActions}
        selectedCount={selectedRows.length}
        bulkActions={bulkActions?.(selectedRows)}
      />

      <div
        className={cn("rounded-md border", maxHeight && "overflow-auto")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-background")}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-32">
                  {emptyState ?? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="text-muted-foreground">{emptyMessage}</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          totalRows={totalRows}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

export default DataTable;
