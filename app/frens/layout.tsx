import NavigationBar from "../(navigation)/NavigationBar";

export default function FrensLayout({children}: {children: React.ReactNode}) {
    return (
        <>
        <NavigationBar />
        {children}
        </>
    )
}