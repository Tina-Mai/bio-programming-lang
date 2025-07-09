import React, { useState } from "react";
import { Chip, ChevronDown } from "@carbon/icons-react";
import { GeneratorInstance, generatorOptions } from "@/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useViewer } from "@/context/ViewerContext";
import { useProgram } from "@/context/ProgramContext";

interface GeneratorBoxProps {
	generator: GeneratorInstance;
}

const GeneratorBox: React.FC<GeneratorBoxProps> = ({ generator }) => {
	const { clickedGeneratorKey, setClickedGeneratorKey } = useViewer();
	const { updateGeneratorKey } = useProgram();
	const [searchTerm, setSearchTerm] = useState("");
	const filteredGenerators = generatorOptions.filter((g) => g.name?.toLowerCase().includes(searchTerm.toLowerCase()));
	const isClicked = clickedGeneratorKey === generator.key;

	const currentGenerator = generatorOptions.find((g) => g.key === generator.key) || { name: "Unknown" };

	return (
		<div
			className={`w-[180px] bg-system-blue/30 border rounded-md text-xs backdrop-blur-sm transition-all duration-200 ${
				isClicked ? "border-slate-500/70 border-2" : "border-slate-300 hover:border-slate-400/70"
			}`}
			onClick={() => setClickedGeneratorKey(isClicked ? null : generator.key || null)}
		>
			<div className="horizontal bg-system-slate/65 text-slate-500 px-3 py-2 items-center font-mono border-b border-slate-300 gap-2 capitalize rounded-t-md">
				<Chip className="text-zinc-500/70" size={16} />
				Generator
			</div>
			<div className="horizontal bg-system-slate/30 justify-start items-center gap-3 p-3">
				<DropdownMenu
					onOpenChange={(open) => {
						if (!open) {
							setSearchTerm("");
						}
					}}
				>
					<DropdownMenuTrigger asChild className="w-full" onClick={(e) => e.stopPropagation()}>
						<Button size="sm" variant="outline" className="w-full bg-system-slate/50 hover:bg-system-slate/50 hover:border-slate-400/75">
							<div className="horizontal w-full justify-between items-center gap-1 text-slate-900">
								<div className="truncate text-xs">{currentGenerator.name}</div>
								<ChevronDown />
							</div>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Generators</DropdownMenuLabel>
						<Input
							placeholder="Search"
							className="!bg-white"
							value={searchTerm}
							onChange={(e) => {
								e.stopPropagation();
								setSearchTerm(e.target.value);
							}}
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
							autoFocus
						/>
						<DropdownMenuSeparator />
						{filteredGenerators.map((g) => (
							<DropdownMenuItem
								key={g.name}
								onClick={(e) => {
									e.stopPropagation();
									if (generator.id && g.key) {
										updateGeneratorKey(generator.id, g.key).catch(console.error);
									}
								}}
							>
								<div className="truncate">{g.name}</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
};

export default GeneratorBox;
