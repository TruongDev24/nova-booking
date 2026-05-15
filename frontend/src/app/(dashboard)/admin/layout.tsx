import {AdminSocketListener} from "@/components/admin/admin-socket-listener";

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AdminSocketListener/>
            {children}
        </>
    );
}
