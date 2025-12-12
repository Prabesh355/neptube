"use client"

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/feed");
  }, [router]);
  
  return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center">
        <h1 className="text-5xl text-gray-100">Video incoming!!!</h1>
        {data && <p className="text-gray-300">{data.greeting}</p>}
      </div>
  );
}
