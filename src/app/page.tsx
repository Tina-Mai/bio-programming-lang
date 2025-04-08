import Image from "next/image";

export default function Home() {
	return (
		<div className="horizontal h-[calc(100vh)] items-start p-5 gap-5">
			<Image src="/logo.svg" alt="Logo" width={50} height={50} />
			<div className="vertical h-full w-full border border-zinc-300 bg-white rounded-sm"></div>
		</div>
	);
}
