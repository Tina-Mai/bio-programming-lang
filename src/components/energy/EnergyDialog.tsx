import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ErrorFilled } from "@carbon/icons-react";
import { useProgram } from "@/context/ProgramContext";
import { useEffect, useState } from "react";

const EnergyDialog = () => {
	const { programRunStatus, programOutputs, programRunError, resetProgramRun } = useProgram(); // Removed startProgramRun
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (programRunStatus === "loading" || programRunStatus === "running" || programRunStatus === "error") {
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, [programRunStatus]);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			// If dialog is closed by user action (esc, click outside), reset the run state
			// but only if it's not in an error state that we might want the user to see before manually closing
			if (programRunStatus !== "error") {
				resetProgramRun();
			}
		}
	};

	// This component no longer needs a DialogTrigger as it's controlled by context.
	// The CompileButton is now separate and initiates the process.

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="min-w-[50vw] max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{programRunStatus === "loading" && "Initializing Program Run..."}
						{programRunStatus === "running" && "Program Running: Monitoring Outputs"}
						{programRunStatus === "completed" && "Program Completed"}
						{programRunStatus === "error" && "Program Error"}
						{programRunStatus === "idle" && "Program Idle"} {/* Should not typically be seen if isOpen logic is correct */}
					</DialogTitle>
					{programRunStatus !== "error" && <DialogDescription>Streaming outputs from the energy function calculation.</DialogDescription>}
					{programRunStatus === "error" && programRunError && (
						<DialogDescription className="text-red-600 flex items-center gap-2">
							<ErrorFilled /> {programRunError}
						</DialogDescription>
					)}
				</DialogHeader>

				<div className="flex-grow overflow-y-auto p-1">
					{programRunStatus === "loading" && <p>Please wait while the program initializes...</p>}

					{(programRunStatus === "running" || programRunStatus === "completed" || programRunStatus === "error") && (
						<div className="vertical gap-2">
							{programOutputs.length === 0 && programRunStatus === "running" && <p className="text-slate-500">Waiting for first output...</p>}
							{programOutputs.map((output) => (
								<div key={output.id} className="bg-slate-100 p-2 rounded text-xs font-mono">
									<p>
										<strong>Sequence Node ID:</strong> {output.sequence_node_id}
									</p>
									{output.created_at && (
										<p>
											<strong>Timestamp:</strong> {new Date(output.created_at).toLocaleString()}
										</p>
									)}
									<p>
										<strong>Metadata:</strong>
									</p>
									<pre className="whitespace-pre-wrap break-all bg-slate-200 p-1 mt-1 rounded">{JSON.stringify(output.metadata, null, 2)}</pre>
								</div>
							))}
							{programOutputs.length > 0 && programRunStatus === "running" && <p className="text-slate-500 pt-2">Still listening for more outputs...</p>}
						</div>
					)}
				</div>

				<div className="horizontal items-center gap-2 pt-4 border-t mt-auto">
					<Button variant="outline" className="flex items-center gap-2 w-fit" disabled={programOutputs.length === 0}>
						<Download className="text-slate-600" />
						Download output CSV
					</Button>
					<Button variant="default" onClick={() => resetProgramRun()} className="ml-auto">
						{programRunStatus === "error" || programRunStatus === "completed" ? "Close" : "Stop & Close"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EnergyDialog;
