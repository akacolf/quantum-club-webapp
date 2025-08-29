import NavigationBar from "../(navigation)/NavigationBar";

export default function EcosystemLayout({children} : {children: React.ReactNode}) {
    return (
        <>
        <NavigationBar />
        {children}
        </>
    )
}