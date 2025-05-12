import React, { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "@carbon/icons-react";
import { Input } from "@/components/ui/input";
import { Constraint, constraintOptions } from "@/types";

const ConstraintDropdown = ({ constraint: currentSelectedConstraint, setConstraint }: { constraint?: Constraint; setConstraint: (constraint: Constraint) => void }) => {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredConstraints = constraintOptions.filter((constraint) => constraint.name.toLowerCase().includes(searchTerm.toLowerCase()));

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					setSearchTerm("");
				}
			}}
		>
			<DropdownMenuTrigger>
				<Button size="sm" variant="outline" className="bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400/70" onClick={(e) => e.stopPropagation()}>
					<div className={`flex items-center gap-1 ${currentSelectedConstraint ? "text-slate-900" : "text-slate-500/80"}`}>
						<div className="text-xs">{currentSelectedConstraint ? currentSelectedConstraint.name : "Select constraint"}</div>
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
				{filteredConstraints.map((constraint) => (
					<DropdownMenuCheckboxItem
						key={constraint.name}
						checked={currentSelectedConstraint?.name === constraint.name}
						onCheckedChange={(isChecked) => {
							if (isChecked) {
								setConstraint(constraint);
							}
						}}
					>
						{constraint.name}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ConstraintDropdown;
