import {UserSocketListener} from "./components/UserSocketListener";

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
