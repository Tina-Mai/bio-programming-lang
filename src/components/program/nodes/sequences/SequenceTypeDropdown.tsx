import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "@carbon/icons-react";
import { SequenceType } from "@/types";

const SequenceTypeDropdown = ({ sequenceType: currentSelectedSequenceType, setSequenceType }: { sequenceType?: SequenceType; setSequenceType: (sequenceType: SequenceType) => void }) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="w-full">
				<Button size="sm" variant="outline" className="w-full bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400/70" onClick={(e) => e.stopPropagation()}>
					<div className={`horizontal w-full justify-between items-center gap-1 ${currentSelectedSequenceType ? "text-slate-900" : "text-slate-500/80"}`}>
						<div className="text-xs">
							{currentSelectedSequenceType ? (currentSelectedSequenceType === "dna" ? "DNA" : currentSelectedSequenceType === "rna" ? "RNA" : "Protein") : "Select sequence type"}
						</div>
						<ChevronDown />
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Sequence type</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{["dna", "rna", "protein"].map((sequenceType) => (
					<DropdownMenuItem
						key={sequenceType}
						onClick={() => {
							setSequenceType(sequenceType as SequenceType);
						}}
					>
						{sequenceType === "dna" ? "DNA" : sequenceType === "rna" ? "RNA" : "Protein"}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default SequenceTypeDropdown;
