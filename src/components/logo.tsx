import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="Manuten & Clean"
        width={900}
        height={195}
        priority
        className="h-8 w-auto shrink-0"
      />
      <span className="hidden text-[11px] font-medium tracking-wide text-slate-500 uppercase sm:inline">
        Fogli di lavoro
      </span>
    </span>
  );
}
