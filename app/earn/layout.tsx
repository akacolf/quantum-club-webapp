import NavigationBar from "../navigation/NavigationBar";

export default function EarnLayout({children}: {children: React.ReactNode}) {
    return (
        <>
        <NavigationBar />
        {children}
        </>
    )
}