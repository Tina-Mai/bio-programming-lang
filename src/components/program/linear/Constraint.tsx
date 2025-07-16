import React, { useState } from "react";
import { SettingsAdjust, ChevronDown } from "@carbon/icons-react";
import { ConstraintInstance, constraintOptions } from "@/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useViewer } from "@/context/ViewerContext";
import { useProgram } from "@/context/ProgramContext";
import { cn } from "@/lib/utils";

interface ConstraintBoxProps {
	constraint: ConstraintInstance;
	isFreeFloating: boolean;
}

const ConstraintBox: React.FC<ConstraintBoxProps> = ({ constraint, isFreeFloating }) => {
	const { clickedConstraintKey, setClickedConstraintKey } = useViewer();
	const { updateConstraintKey } = useProgram();
	const [searchTerm, setSearchTerm] = useState("");
	const filteredConstraints = constraintOptions.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
	const constraintGroupKey = constraint.key || constraint.id;
	const isClicked = clickedConstraintKey === constraintGroupKey;

	const hasKey = !!constraint.key;
	const currentConstraintName = constraintOptions.find((c) => c.key === constraint.key)?.name || "Select a constraint";

	const borderStyle = isClicked ? "border-slate-500/70 border-2" : isFreeFloating ? "border-slate-400/70 border-dashed" : "border-slate-300 hover:border-slate-400/70";

	return (
		<div
			className={`w-[180px] bg-system-yellow/30 border rounded-md text-xs backdrop-blur-sm transition-all duration-200 ${borderStyle}`}
			onClick={() => setClickedConstraintKey(isClicked ? null : constraintGroupKey)}
		>
			<div className="horizontal justify-between bg-system-yellow/70 text-slate-500 px-3 py-2 items-center border-b border-slate-300 rounded-t-md">
				<div className="horizontal items-center gap-2 font-mono capitalize">
					<SettingsAdjust className="text-zinc-500/75" size={16} />
					constraint
				</div>
			</div>
			<div className="p-3">
				<DropdownMenu
					onOpenChange={(open) => {
						if (!open) {
							setSearchTerm("");
						}
					}}
				>
					<DropdownMenuTrigger asChild className="w-full" onClick={(e) => e.stopPropagation()}>
						<Button size="sm" variant="outline" className="w-full bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400/70">
							<div className={cn("horizontal w-full justify-between items-center gap-1", hasKey ? "text-slate-900" : "text-slate-400")}>
								<div className="truncate text-xs">{currentConstraintName}</div>
								<ChevronDown />
							</div>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>Constraints</DropdownMenuLabel>
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
						{filteredConstraints.map((c) => (
							<DropdownMenuItem
								key={c.name}
								onClick={(e) => {
									e.stopPropagation();
									if (constraint.id && c.key) {
										updateConstraintKey(constraint.id, c.key).catch(console.error);
									}
								}}
							>
								<div className="truncate">{c.name}</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
};

export default ConstraintBox;
