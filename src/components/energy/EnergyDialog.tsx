import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "@carbon/icons-react";

const EnergyDialog = () => {
	return (
		<Dialog>
			<DialogContent className="min-w-[50vw] max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Energy Dialog</DialogTitle>
					<DialogDescription>Dialog description</DialogDescription>
				</DialogHeader>

				<div className="flex-grow overflow-y-auto p-1">{/* Content area */}</div>

				<div className="horizontal items-center gap-2 pt-4 border-t mt-auto">
					<Button variant="outline" className="flex items-center gap-2 w-fit">
						<Download className="text-slate-600" />
						Download output CSV
					</Button>
					<Button variant="default" className="ml-auto">
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EnergyDialog;
