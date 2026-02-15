import Link from "next/link";
import Image from "next/image";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" height={36} width={36} alt="logo" />
          <span className="text-xl font-semibold tracking-tight">NepTube</span>
        </Link>
      </div>
      {children}
      <p className="mt-8 text-xs text-muted-foreground">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export default Layout;