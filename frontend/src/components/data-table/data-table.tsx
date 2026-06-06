"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {ChevronLeft, ChevronRight, Search, SlidersHorizontal} from "lucide-react"
import {useLanguage} from "@/context/language-context"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
                                             columns,
                                             data,
                                             searchKey,
                                             searchPlaceholder,
                                         }: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    
    const {locale, t} = useLanguage();

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    const placeholderText = searchPlaceholder || t("common.search");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                {searchKey ? (
                    <div className="flex items-center flex-1 max-w-sm relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60"/>
                        <Input
                            placeholder={placeholderText}
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="pl-9 h-10 rounded-xl bg-card border-border focus:border-primary focus:ring-primary/20 text-xs font-semibold"
                        />
                    </div>
                ) : (
                    <div />
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-auto flex h-10 gap-2 px-3.5 rounded-xl border-border bg-secondary hover:bg-secondary/80 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5"/>
                                <span className="hidden sm:inline">{locale === "vi" ? "Hiển thị" : "Columns"}</span>
                            </Button>
                        } 
                    />
                    <DropdownMenuContent align="end" className="w-[150px] rounded-xl p-1">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize rounded-lg px-2 py-1.5 text-xs font-bold cursor-pointer"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-300">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-muted/40 border-b border-border hover:bg-muted/40">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}
                                                   className="px-6 h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="group transition-all hover:bg-muted/15 border-b border-border/60 last:border-0"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-6 py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-40 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                                        <Search className="h-6 w-6"/>
                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                            {locale === "vi" ? "Không tìm thấy dữ liệu" : "No results found"}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
                <div>
                    {locale === "vi" ? (
                        <>
                            Đã chọn <span className="font-bold text-foreground">{table.getFilteredSelectedRowModel().rows.length}</span> trên{" "}
                            <span className="font-bold text-foreground">{table.getFilteredRowModel().rows.length}</span> dòng.
                        </>
                    ) : (
                        <>
                            <span className="font-bold text-foreground">{table.getFilteredSelectedRowModel().rows.length}</span> of{" "}
                            <span className="font-bold text-foreground">{table.getFilteredRowModel().rows.length}</span> rows selected.
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8 p-0 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                        <ChevronLeft className="h-4 w-4"/>
                    </Button>
                    <span className="text-[10px] font-black text-muted-foreground px-2 uppercase tracking-wide">
                        {locale === "vi" ? (
                            <>Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</>
                        ) : (
                            <>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</>
                        )}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8 p-0 rounded-lg active:scale-95 transition-all cursor-pointer"
                    >
                        <ChevronRight className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}

