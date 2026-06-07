"use client";

import React, {useState} from "react";
import {
    Plus, Map as MapIcon, Edit, Trash2, X, Loader2,
    Camera,
    MoreHorizontal,
    Star
} from "lucide-react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {courtService, Court} from "@/services/court.service";
import {toast} from "sonner";
import Image from "next/image";
import {ColumnDef} from "@tanstack/react-table";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {useSocket} from "@/hooks/use-socket";
import {AdminReviewsDialog} from "@/components/reviews/AdminReviewsDialog";
import {useLanguage} from "@/context/language-context";

import {DataTable} from "@/components/data-table/data-table";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Skeleton} from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Configuration ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface CourtFormValues {
    name: string;
    location: string;
    pricePerHour: number;
    description?: string;
    openingTime: string;
    closingTime: string;
    amenities?: string[];
}

export default function AdminCourtsPage() {
    const queryClient = useQueryClient();
    const {t} = useLanguage();

    const courtSchema = React.useMemo(() => z.object({
        name: z.string()
            .trim()
            .min(5, t("courts.valNameMin"))
            .max(100, t("courts.valNameMax")),
        location: z.string()
            .trim()
            .min(10, t("courts.valLocationMin"))
            .max(255, t("courts.valLocationMax")),
        pricePerHour: z.number({message: t("courts.valPriceNumber")})
            .min(0, t("courts.valPriceMin"))
            .max(2000000, t("courts.valPriceMax")),
        description: z.string().optional(),
        openingTime: z.string().min(1, t("courts.valOpenTime")),
        closingTime: z.string().min(1, t("courts.valCloseTime")),
        amenities: z.array(z.string()).optional(),
    }), [t]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [courtToDelete, setCourtToDelete] = useState<string | null>(null);
    const [activeReviewsCourt, setActiveReviewsCourt] = useState<Court | null>(null);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [amenityInput, setAmenityInput] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: {errors},
    } = useForm<CourtFormValues>({
        resolver: zodResolver(courtSchema),
        defaultValues: {
            name: "",
            location: "",
            pricePerHour: 50000,
            description: "",
            openingTime: "05:00",
            closingTime: "22:00",
            amenities: [],
        },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const watchAmenities = watch("amenities") || [];

    // --- REAL-TIME UPDATES ---
    const socket = useSocket();
    React.useEffect(() => {
        if (!socket) return;

        const handleCourtChange = (data: { name?: string; [key: string]: unknown }) => {
            console.log("Real-time court update received:", data);
            
            if (data?.name) {
                toast.info(t("courts.toastCourtSync", { name: data.name }), {
                    description: t("courts.toastCourtSyncDesc"),
                });
            } else {
                toast.info(t("courts.toastCourtUpdated"));
            }

            void queryClient.invalidateQueries({ queryKey: ["courts"] });
            void queryClient.refetchQueries({ queryKey: ["courts"] });
        };

        socket.on("court_added", handleCourtChange);
        socket.on("court_updated", handleCourtChange);
        socket.on("court_status_changed", handleCourtChange);

        return () => {
            socket.off("court_added", handleCourtChange);
            socket.off("court_updated", handleCourtChange);
            socket.off("court_status_changed", handleCourtChange);
        };
    }, [socket, queryClient, t]);

    // --- React Query: Fetch ---
    const {data: courts = [], isLoading} = useQuery({
        queryKey: ["courts"],
        queryFn: async () => {
            const result = await courtService.getAll({page: 1, limit: 10});
            return result.data;
        },
    });

    // --- React Query: Mutations ---
    const createMutation = useMutation({
        mutationFn: (formData: FormData) => courtService.create(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["courts"]});
            setIsModalOpen(false);
            reset();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({id, formData}: { id: string; formData: FormData }) =>
            courtService.update(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["courts"]});
            setIsModalOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => courtService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["courts"]});
            setCourtToDelete(null); // Fix Bug 4: Close modal
            toast.success(t("courts.toastDeactivateSuccess")); // Fix Bug 3: Wording
        },
        onError: () => {
            toast.error(t("courts.toastDeactivateError")); // Fix Bug 3: Wording
        }
    });

    const reactivateMutation = useMutation({
        mutationFn: (id: string) => courtService.reactivate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["courts"]});
            toast.success(t("courts.toastReactivateSuccess"));
        },
        onError: () => {
            toast.error(t("courts.toastReactivateError"));
        }
    });

    const columns: ColumnDef<Court>[] = [
        {
            accessorKey: "name",
            header: t("courts.tableName"),
            cell: ({row}) => {
                const court = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden border bg-muted">
                            {court.images?.[0] ? (
                                <Image src={court.images[0]} alt={court.name} fill className="object-cover"/>
                            ) : (
                                <Camera
                                    className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50"/>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight">{court.name}</span>
                            <span
                                className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{court.openingTime} - {court.closingTime}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "location",
            header: t("courts.tableLocation"),
            cell: ({row}) => (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium max-w-[200px]">
                    <MapIcon className="h-3 w-3 shrink-0"/>
                    <span className="truncate">{row.original.location}</span>
                </div>
            ),
        },
        {
            accessorKey: "pricePerHour",
            header: t("courts.tablePrice"),
            cell: ({row}) => (
                <div className="font-black text-primary">
                    {row.original.pricePerHour.toLocaleString()}đ
                </div>
            ),
        },
        {
            accessorKey: "isDeleted",
            header: t("courts.tableStatus"),
            cell: ({row}) => {
                const isDeleted = row.original.isDeleted;
                return (
                    <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase text-center w-fit ${
                        isDeleted ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}>
                        {isDeleted ? t("courts.statusInactive") : t("courts.statusActive")}
                    </div>
                );
            },
        },
        {
            accessorKey: "amenities",
            header: t("courts.tableAmenities"),
            cell: ({row}) => {
                const amenities = row.original.amenities as string[] || [];
                return (
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {amenities.slice(0, 3).map((a) => (
                            <div
                                key={a}
                                className="px-2 py-0.5 rounded-md bg-muted border text-[10px] font-bold text-muted-foreground whitespace-nowrap"
                            >
                                {a}
                            </div>
                        ))}
                        {amenities.length > 3 && <span
                            className="text-[10px] text-muted-foreground self-center">+{amenities.length - 3}</span>}
                    </div>
                );
            },
        },
        {
            id: "actions",
            cell: ({row}) => {
                const court = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0"/>}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4"/>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>{t("courts.tableActions")}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openModal(court)} className="cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4"/> {t("courts.actionEdit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setActiveReviewsCourt(court)} className="cursor-pointer">
                                    <Star className="mr-2 h-4 w-4 text-amber-500 fill-amber-500"/> {t("courts.actionReviews")}
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator/>
                            {court.isDeleted ? (
                                <DropdownMenuItem
                                    onClick={() => reactivateMutation.mutate(court.id)}
                                    className="text-emerald-600 focus:text-emerald-700 cursor-pointer"
                                >
                                    <Plus className="mr-2 h-4 w-4"/> {t("courts.actionReactivate")}
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={() => setCourtToDelete(court.id)}
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/> {t("courts.actionDeactivate")}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    toast.error(t("courts.toastInvalidFile").replace("{name}", file.name));
                    return;
                }
                if (file.size > MAX_FILE_SIZE) {
                    toast.error(t("courts.toastFileSize").replace("{name}", file.name));
                    return;
                }
            }
            setSelectedFiles(files);
            const filePreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(filePreviews);
        }
    };

    const openModal = (court: Court | null = null) => {
        setEditingCourt(court);
        setPreviews([]);
        setSelectedFiles([]);

        if (court) {
            setValue("name", court.name);
            setValue("location", court.location);
            setValue("pricePerHour", court.pricePerHour);
            setValue("description", court.description || "");
            setValue("openingTime", court.openingTime);
            setValue("closingTime", court.closingTime);
            setValue("amenities", Array.isArray(court.amenities) ? (court.amenities as string[]) : []);
        } else {
            reset();
        }
        setIsModalOpen(true);
    };

    const addAmenity = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = amenityInput.trim().replace(/,$/, "");
            if (val && !watchAmenities.includes(val)) {
                setValue("amenities", [...watchAmenities, val]);
                setAmenityInput("");
            }
        }
    };

    const removeAmenity = (val: string) => {
        setValue("amenities", watchAmenities.filter(item => item !== val));
    };

    const onFormSubmit = async (data: CourtFormValues) => {
        if (!editingCourt && selectedFiles.length === 0) {
            toast.error(t("courts.toastAddImgError"));
            return;
        }

        const formData = new FormData();
        formData.append("name", data.name.trim());
        formData.append("location", data.location.trim());
        formData.append("pricePerHour", Math.round(data.pricePerHour).toString());
        formData.append("openingTime", data.openingTime);
        formData.append("closingTime", data.closingTime);
        formData.append("description", (data.description || "").trim());
        if (data.amenities) formData.append("amenities", JSON.stringify(data.amenities));
        selectedFiles.forEach((file) => formData.append("images", file));

        if (editingCourt) {
            toast.promise(updateMutation.mutateAsync({id: editingCourt.id, formData}), {
                loading: t("courts.toastUpdateLoading"),
                success: t("courts.toastUpdateSuccess"),
                error: (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("courts.toastUpdateError"),
            });
        } else {
            toast.promise(createMutation.mutateAsync(formData), {
                loading: t("courts.toastCreateLoading"),
                success: t("courts.toastCreateSuccess"),
                error: (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("courts.toastCreateError"),
            });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight uppercase">{t("courts.title")}</h1>
                    <p className="text-muted-foreground font-medium">{t("courts.subtitle")}</p>
                </div>
                <Button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 h-11 px-6 rounded-xl font-bold shadow-lg cursor-pointer"
                >
                    <Plus className="w-5 h-5"/>
                    <span>{t("courts.addBtn")}</span>
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-[250px]"/>
                    <div className="border rounded-xl">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0">
                                <Skeleton className="h-10 w-10 rounded-lg"/>
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-[40%]"/>
                                    <Skeleton className="h-3 w-[20%]"/>
                                </div>
                                <Skeleton className="h-4 w-[100px]"/>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={courts}
                    searchKey="name"
                    searchPlaceholder={t("courts.searchPlaceholder")}
                />
            )}

            {/* Confirmation Dialog for Delete */}
            <AlertDialog open={!!courtToDelete} onOpenChange={() => setCourtToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] bg-card text-card-foreground">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase">{t("courts.deactivateTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">
                            {t("courts.deactivateDesc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel className="rounded-xl h-11 font-bold cursor-pointer">{t("courts.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => courtToDelete && deleteMutation.mutate(courtToDelete)}
                            className="rounded-xl h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold cursor-pointer active:scale-98"
                        >
                            {t("courts.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
                    <div
                        className="bg-card border rounded-[2rem] shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                {editingCourt ? t("courts.modalEditTitle") : t("courts.modalAddTitle")}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X className="w-6 h-6 text-muted-foreground"/>
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit(onFormSubmit)}
                              className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-3">
                                <label
                                    className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("courts.modalImagesLabel")}</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {previews.map((src, idx) => (
                                        <div key={idx}
                                             className="aspect-square rounded-xl border overflow-hidden relative shadow-sm">
                                            <Image src={src} alt="preview" fill className="object-cover"/>
                                        </div>
                                    ))}
                                    {previews.length < 5 && (
                                        <label
                                            className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted cursor-pointer transition-all bg-muted/50">
                                            <Camera className="w-5 h-5 mb-1"/>
                                            <span className="text-[9px] font-black uppercase">{t("common.add") || "Add"}</span>
                                            <input type="file" multiple accept="image/*" onChange={handleFileChange}
                                                   className="hidden"/>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalNameLabel")}</label>
                                    <input
                                        {...register("name")}
                                        className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.name ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`}
                                    />
                                    {errors.name &&
                                        <p className="text-destructive mt-1 text-[10px] font-bold uppercase">{errors.name.message}</p>}
                                </div>

                                <div className="col-span-2">
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalLocationLabel")}</label>
                                    <input
                                        {...register("location")}
                                        className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.location ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`}
                                    />
                                    {errors.location &&
                                        <p className="text-destructive mt-1 text-[10px] font-bold uppercase">{errors.location.message}</p>}
                                </div>

                                <div>
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalPriceLabel")}</label>
                                    <input
                                        type="number"
                                        {...register("pricePerHour", {valueAsNumber: true})}
                                        className={`w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none transition-all font-bold text-sm ${errors.pricePerHour ? 'border-destructive' : 'focus:border-primary focus:bg-background'}`}
                                    />
                                    {errors.pricePerHour &&
                                        <p className="text-destructive mt-1 text-[10px] font-bold uppercase">{errors.pricePerHour.message}</p>}
                                </div>

                                <div>
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalDescLabel")}</label>
                                    <textarea
                                        {...register("description")}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-muted/50 border rounded-xl outline-none focus:border-primary focus:bg-background font-bold text-sm transition-all resize-none"
                                        placeholder={t("courts.modalDescPlaceholder")}
                                    />
                                </div>

                                <div>
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalOpenTime")}</label>
                                    <input type="time" {...register("openingTime")}
                                           className="w-full h-11 px-4 bg-muted/50 border rounded-xl focus:border-primary focus:bg-background outline-none font-bold text-sm"/>
                                </div>

                                <div>
                                    <label
                                        className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("courts.modalCloseTime")}</label>
                                    <input type="time" {...register("closingTime")}
                                           className="w-full h-11 px-4 bg-muted/50 border rounded-xl focus:border-primary focus:bg-background outline-none font-bold text-sm"/>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label
                                    className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("courts.modalAmenitiesLabel")}</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {watchAmenities.map((item) => (
                                        <div
                                            key={item}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] font-black uppercase text-primary animate-in zoom-in duration-200"
                                        >
                                            {item}
                                            <button
                                                type="button"
                                                onClick={() => removeAmenity(item)}
                                                className="hover:text-destructive transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={amenityInput}
                                        onChange={(e) => setAmenityInput(e.target.value)}
                                        onKeyDown={addAmenity}
                                        placeholder={t("courts.modalAmenitiesPlaceholder")}
                                        className="w-full h-11 px-4 bg-muted/50 border rounded-xl outline-none focus:border-primary focus:bg-background font-bold text-sm transition-all"
                                    />
                                    <Plus
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50"/>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-12 rounded-xl cursor-pointer">{t("courts.cancel")}</Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="flex-[2] h-12 rounded-xl text-lg font-black uppercase tracking-widest cursor-pointer active:scale-98"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) &&
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin"/>}
                                    {t("courts.save")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeReviewsCourt && (
                <AdminReviewsDialog
                    key={activeReviewsCourt.id}
                    courtId={activeReviewsCourt.id}
                    courtName={activeReviewsCourt.name}
                    open={!!activeReviewsCourt}
                    onOpenChange={(open) => !open && setActiveReviewsCourt(null)}
                />
            )}
        </div>
    );
}
