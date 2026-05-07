import {AdminSocketListener} from "./components/AdminSocketListener";

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
