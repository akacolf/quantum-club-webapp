import NavigationBar from "../navigation/NavigationBar";

export default function HomeLayout({children}: {children: React.ReactNode}) {
    return (
        <>
        <NavigationBar />
        {children}
        </>
    )
}