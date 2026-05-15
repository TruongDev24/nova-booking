import { toast } from "sonner";

/**
 * Reusable handler for UI elements that are not yet implemented.
 * Prevents default behavior, stops propagation, and shows a "Coming Soon" toast.
 */
export const handleComingSoon = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    toast.info("🚧 Tính năng đang được phát triển. Vui lòng quay lại sau!", {
        description: "Chúng tôi đang nỗ lực để sớm ra mắt tính năng này.",
        duration: 3000,
    });
};
