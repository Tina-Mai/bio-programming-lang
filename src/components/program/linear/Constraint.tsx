import React, { useState } from "react";
import { SettingsAdjust, ChevronDown } from "@carbon/icons-react";
import { Constraint as ConstraintType, constraintOptions } from "@/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useViewer } from "@/context/ViewerContext";

interface ConstraintBoxProps {
	constraint: ConstraintType;
}

const ConstraintBox: React.FC<ConstraintBoxProps> = ({ constraint }) => {
	const { clickedConstraintKey, setClickedConstraintKey } = useViewer();
	const [searchTerm, setSearchTerm] = useState("");
	const filteredConstraints = constraintOptions.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
	const isClicked = clickedConstraintKey === constraint.key;

	return (
		<div
			className={`w-[180px] bg-system-yellow/30 border rounded-md text-xs backdrop-blur-sm transition-all duration-200 ${
				isClicked ? "border-slate-500/70 border-2" : "border-slate-300 hover:border-slate-400/70"
			}`}
			onClick={() => setClickedConstraintKey(isClicked ? null : constraint.key)}
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
					<DropdownMenuTrigger className="w-full" onClick={(e) => e.stopPropagation()}>
						<Button size="sm" variant="outline" className="w-full bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400/70">
							<div className="horizontal w-full justify-between items-center gap-1 text-slate-900">
								<div className="text-xs">{constraint.name}</div>
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
									// No functionality needed as per requirements
								}}
							>
								{c.name}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
};

export default ConstraintBox;
