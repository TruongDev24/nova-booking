import {UserSocketListener} from "@/components/user/user-socket-listener";

export default function UserLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <>
            <UserSocketListener/>
            {children}
        </>
    );
}
