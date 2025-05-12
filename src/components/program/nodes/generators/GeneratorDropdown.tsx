import React, { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "@carbon/icons-react";
import { Input } from "@/components/ui/input";
import { Generator, generatorOptions, SequenceType } from "@/types";

const GeneratorDropdown = ({
	generator: currentSelectedGenerator,
	setGenerator,
	sequenceType,
}: {
	generator?: Generator;
	setGenerator: (generator: Generator) => void;
	sequenceType: SequenceType;
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const allowedGenerators = generatorOptions.filter((generator) => generator.types?.includes(sequenceType) || !generator.types);
	const filteredGenerators = allowedGenerators.filter((generator) => generator.name.toLowerCase().includes(searchTerm.toLowerCase()));

	// TODO: if the selected generator is not meant for the sequence type, show error

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					setSearchTerm("");
				}
			}}
		>
			<DropdownMenuTrigger className="w-full">
				<Button size="sm" variant="outline" className="w-full bg-system-slate/50 hover:bg-system-slate/70 hover:border-slate-400/70" onClick={(e) => e.stopPropagation()}>
					<div className={`horizontal w-full justify-between items-center gap-1 ${currentSelectedGenerator ? "text-slate-900" : "text-slate-500/80"}`}>
						<div className="text-xs">{currentSelectedGenerator ? currentSelectedGenerator.name : "Select model"}</div>
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
				{filteredGenerators.map((generator) => (
					<DropdownMenuItem
						key={generator.name}
						onClick={() => {
							setGenerator(generator);
						}}
					>
						{generator.name}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default GeneratorDropdown;
