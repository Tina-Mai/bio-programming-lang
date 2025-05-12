const StatusDot = ({ status = "default" }: { status?: "default" | "success" | "error" | "warning" }) => {
	return (
		<span className="relative flex size-[9px]">
			<span
				className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
					status === "success" ? "bg-green-500" : status === "error" ? "bg-rose-500" : status === "warning" ? "bg-yellow-500" : "bg-blue-500"
				} opacity-75`}
			></span>
			<span
				className={`relative inline-flex size-[9px] rounded-full ${
					status === "success" ? "bg-green-600" : status === "error" ? "bg-rose-600" : status === "warning" ? "bg-yellow-600" : "bg-blue-600"
				}`}
			></span>
		</span>
	);
};

export default StatusDot;
