import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="flex-1 min-h-screen">{children}</main>
            <Footer />
        </>
    );
}
