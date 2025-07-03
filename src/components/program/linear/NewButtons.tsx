"use client";
import React from "react";
import { Button } from "@/components/ui/button";

const NewButtons: React.FC = () => {
	return (
		<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
			<Button variant="outline" size="sm">
				New constraint
			</Button>
			<Button variant="outline" size="sm">
				New generator
			</Button>
			<Button variant="outline" size="sm">
				New segment
			</Button>
		</div>
	);
};

export default NewButtons;
