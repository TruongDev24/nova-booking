"use client";

import {useState} from "react";
import {useForm, ControllerRenderProps} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {Star} from "lucide-react";
import {toast} from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import apiClient from "@/services/apiClient";

const formSchema = z.object({
    rating: z.number().min(1, "Vui lòng chọn số sao").max(5),
    comment: z.string().min(5, "Nhận xét phải có ít nhất 5 ký tự").max(500),
});

type FormValues = z.infer<typeof formSchema>;

interface ReviewDialogProps {
    bookingId: string;
    courtName: string;
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function ReviewDialog({bookingId, courtName, onSuccess, children}: ReviewDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            rating: 5,
            comment: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            await apiClient.post("/reviews", {
                bookingId,
                ...values,
            });
            toast.success("Cảm ơn bạn đã đánh giá!");
            setOpen(false);
            form.reset();
            if (onSuccess) onSuccess();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || "Không thể gửi đánh giá");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                children ? (children as React.ReactElement) : <Button variant="outline" size="sm">Đánh giá</Button>
            }/>
            <DialogContent className="sm:max-width-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Đánh giá trải nghiệm</DialogTitle>
                    <DialogDescription>
                        Chia sẻ cảm nhận của bạn về sân <strong>{courtName}</strong> để giúp cộng đồng nhé!
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField
                            control={form.control}
                            name="rating"
                            render={({field}: { field: ControllerRenderProps<FormValues, "rating"> }) => (
                                <FormItem className="flex flex-col items-center gap-2">
                                    <FormLabel className="text-base">Mức độ hài lòng</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => field.onChange(star)}
                                                    className="transition-transform hover:scale-110 active:scale-95"
                                                >
                                                    <Star
                                                        className={`h-8 w-8 ${
                                                            star <= field.value
                                                                ? "fill-yellow-400 text-yellow-400"
                                                                : "text-gray-300"
                                                        }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="comment"
                            render={({field}: { field: ControllerRenderProps<FormValues, "comment"> }) => (
                                <FormItem>
                                    <FormLabel>Nhận xét chi tiết</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Hãy nói gì đó về chất lượng sân, ánh sáng, dịch vụ..."
                                            className="min-h-[100px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
